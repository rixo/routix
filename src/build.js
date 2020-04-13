import * as fs from 'fs'
import * as path from 'path'
import parser from '@/parse'
import { Deferred } from '@/util'
import Tree from './build/tree'
import Routes from './build/routes'
import { indent } from './build/util'

const now = Date.now

const resolved = Promise.resolve()

const wait = delay => new Promise(resolve => setTimeout(resolve, delay))

export default (options = {}) => {
  const {
    buildDebounce = 50,
    write: { routes: writeRoutes, tree: writeTree } = {},
    writeFile = (path, contents, encoding = 'utf8') =>
      fs.promises.writeFile(path, contents, encoding),
    log = console,
  } = options

  const files = {}

  const tree = writeTree && Tree(options)
  const routes = (writeRoutes || writeTree) && Routes(options)

  const builders = [routes, tree].filter(Boolean)

  const parse = parser(options)

  let started = false
  let timeout = null
  let scheduled = false
  let running = false
  const startDeferred = Deferred()
  let buildPromise = Promise.resolve()
  let idlePromise = Promise.resolve()
  let startTime = now()

  const isIdle = () => started && timeout === null && !scheduled && !running

  const targetsDisplayNames = [writeRoutes, writeTree]
    .filter(Boolean)
    .map(x => path.basename(x))
    .join(', ')

  const logBuildSuccess = () => {
    const duration = now() - startTime
    startTime = null
    // eslint-disable-next-line no-console
    log.info(`[routix] Written: ${targetsDisplayNames} (${duration}ms)`)
  }

  const build = () => {
    if (!routes && !tree) {
      return Promise.resolve()
    }

    running = true

    const dirs = tree ? tree.prepare() : null

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
    buildPromise = buildPromise.then(() => {
      scheduled = false
      return build()
    })
    return buildPromise
  }

  const invalidate = (debounce = buildDebounce) => {
    if (!started) return
    if (timeout !== null) clearTimeout(timeout)
    idlePromise = new Promise((resolve, reject) => {
      const doSchedule = () => schedule().then(resolve, reject)
      timeout = setTimeout(doSchedule, debounce)
      notifyChange()
    })
  }

  const input = () => {
    if (startTime === null) startTime = now()
  }

  const start = () => {
    input()
    started = true
    invalidate(0)
    startDeferred.resolve()
  }

  const _parse = pathStats => {
    const [path] = pathStats
    const file = parse(pathStats)
    files[path] = file
    return file
  }

  const add = pathStats => {
    input()
    const [, stats] = pathStats
    if (stats.isDirectory()) return
    const file = _parse(pathStats)
    builders.forEach(x => x.add(file))
    invalidate()
  }

  const update = pathStats => {
    input()
    const [path, stats] = pathStats
    if (stats.isDirectory()) return
    const previous = files[path]
    const file = _parse(pathStats)
    builders.forEach(x => x.update(file, previous))
    invalidate()
  }

  const remove = ([path, stats]) => {
    input()
    if (stats.isDirectory()) return
    const file = files[path]
    if (!file) return
    delete files[path]
    builders.forEach(x => x.remove(file))
    invalidate()
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

    return _onIdle()
  }

  let changeListeners = []

  const notifyChange = () => {
    for (const f of changeListeners) f()
    changeListeners = []
  }

  const onChange = () => new Promise(resolve => changeListeners.push(resolve))

  return { start, add, update, remove, onChange, onIdle }
}
