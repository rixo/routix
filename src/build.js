import * as fs from 'fs'
import * as path from 'path'
import parser from '@/parse'
import { Deferred, noop } from '@/util'
import Tree from './build/tree'
import Routes from './build/routes'
import { indent } from './build/util'

const now = Date.now

const resolved = Promise.resolve()

const wait = delay => new Promise(resolve => setTimeout(resolve, delay))

export default (options = {}) => {
  const {
    write: { routes: writeRoutes, tree: writeTree } = {},
    buildDebounce = 50,
    writeFile = (path, contents, encoding = 'utf8') =>
      fs.promises.writeFile(path, contents, encoding),
    log = console,
  } = options

  const files = {}

  const tree = writeTree && Tree(options)
  const routes = (writeRoutes || writeTree) && Routes(options)

  const builders = [routes, tree].filter(Boolean)

  const parse = parser(options)
  let errors = []

  let started = false
  let timeout = null
  let scheduled = false
  let running = false
  const startDeferred = Deferred()
  let buildPromise = Promise.resolve()
  // a promise that resolves when we arrive to a point when we might be
  // idle (but not sure, because another volley of changes may have happened
  // since we started processing the one for which this promise was created)
  let idlePromise = Promise.resolve()
  let startTime = now()
  let latches = 0
  let lastInvalidateTime = null

  const isIdle = () =>
    errors.length > 0 ||
    (started && timeout === null && !scheduled && !running && latches === 0)

  const targetsDisplayNames = [writeRoutes, writeTree]
    .filter(Boolean)
    .map(x => path.basename(x))
    .join(', ')

  const logBuildSuccess = () => {
    const duration = now() - startTime
    startTime = null
    log.info(`Written: ${targetsDisplayNames} (${duration}ms)`)
  }

  const build = async () => {
    if (!routes && !tree) {
      return Promise.resolve()
    }

    running = true

    const dirs = tree ? await tree.prepare() : null

    const _routes = routes.generate(dirs)

    const promises = []

    if (writeRoutes) {
      const contents = indent(0, '\n', [
        `${_routes}`,
        writeTree && `f.dirs = d`, // to avoid Rollup's mixed default/named exports warning
        `export default f\n`,
      ])
      promises.push(writeFile(writeRoutes, contents))
    }

    if (writeTree) {
      const _tree = tree.generate()
      const prefix = writeRoutes
        ? `import f from '${writeRoutes}'\n\nconst d = f.dirs`
        : _routes
      const contents = prefix + '\n\n' + _tree
      promises.push(writeFile(writeTree, contents))
    }

    return Promise.all(promises)
      .then(logBuildSuccess)
      .finally(() => {
        running = false
      })
  }

  const schedule = () => {
    timeout = null
    if (scheduled) return
    scheduled = true
    buildPromise = buildPromise
      .then(() => {
        scheduled = false
        return build()
      })
      .catch(err => {
        errors.push(err)
      })
    return buildPromise
  }

  let _resolveIdlePromise = noop

  const invalidate = (debounce = buildDebounce) => {
    if (!started) return

    if (timeout !== null) {
      clearTimeout(timeout)
    }

    // NOTE we still need to resolve the previous idlePromise, or _onIdle will
    // hang on it (especially if we've just cancelled an active timeout just
    // above)
    const resolvePrevious = _resolveIdlePromise

    idlePromise = new Promise(resolve => {
      _resolveIdlePromise = resolve
      const doSchedule = () => {
        if (latches > 0) {
          resolve()
          return
        }
        schedule().finally(resolve)
      }
      timeout = setTimeout(doSchedule, debounce)
      notifyChange() // must happen once timeout is non null (for idle state)
    })

    resolvePrevious()
  }

  const release = (canceled = false) => {
    latches--
    if (canceled) {
      log.info('Bailing out')
      return
    }
    if (latches === 0) {
      invalidate(Math.max(0, buildDebounce - (Date.now() - lastInvalidateTime)))
    }
  }

  // invalidates (i.e. make busy/non idle, and wait to see if more changes are
  // coming for the debounce duration) right when the call is made, then wait
  // for at least the debounce delay (hene lastInvalidateTime), and wait even
  // longer if the given promise has not resolved at this point
  const invalidateUntil = promise => {
    if (!started) return promise
    lastInvalidateTime = Date.now()
    latches++
    let canceled = false
    return promise
      .then(result => {
        canceled = result === false
      })
      .catch(err => {
        canceled = true
        throw err
      })
      .finally(() => release(canceled))
  }

  const input = () => {
    if (startTime === null) {
      startTime = now()
      latches = 0
      errors = []
    }
  }

  const pushError = err => {
    errors.push(err)
  }

  const start = () => {
    input()
    started = true
    invalidate(0)
    startDeferred.resolve()
  }

  // NOTE parse is async, but we need add/update to
  const _parse = async (pathStats, previous) => {
    const [path] = pathStats
    const file = await parse(pathStats, previous)
    // canceled
    if (file === false) return false
    files[path] = file
    return file
  }

  const add = pathStats => {
    input()
    const [, stats] = pathStats
    if (stats.isDirectory()) return
    invalidateUntil(
      _parse(pathStats)
        .then(file => {
          builders.forEach(x => x.add(file))
        })
        .catch(pushError)
    )
  }

  const update = pathStats => {
    input()
    const [path, stats] = pathStats
    if (stats.isDirectory()) return
    const previous = files[path]
    invalidateUntil(
      _parse(pathStats, previous)
        .then(file => {
          if (file === false) return false
          builders.forEach(x => x.update(file, previous))
        })
        .catch(pushError)
    )
  }

  const remove = ([path, stats]) => {
    try {
      input()
      if (stats.isDirectory()) return
      const file = files[path]
      if (!file) return
      delete files[path]
      builders.forEach(x => x.remove(file))
      invalidate()
    } catch (err) {
      pushError(err)
    }
  }

  const _onIdle = () =>
    isIdle() ? resolved : Promise.all([idlePromise, buildPromise]).then(_onIdle)

  const onIdle = async (changeTimeout = 0) => {
    await startDeferred.promise

    if (changeTimeout) {
      // we stop waiting early if Routix has caught the change (waitChange)
      // -- this ensures optimal waiting time but, unfortunately, in the
      // marginal case of when user deletes/renames a Routix page file;
      // we're still degenerate (i.e. wait full delay) for any other source
      // watched by Rollup only...
      await Promise.race([wait(changeTimeout), onChange()])
    }

    await _onIdle()

    if (errors.length > 0) {
      const err = new Error('')
      err.name = 'RoutixBuildError'
      err.errors = errors
      errors = []
      throw err
    }
  }

  let changeListeners = []

  const notifyChange = () => {
    for (const f of changeListeners) f()
    changeListeners = []
  }

  const onChange = () => new Promise(resolve => changeListeners.push(resolve))

  return { start, add, update, remove, onChange, onIdle }
}
