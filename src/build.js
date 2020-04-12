import * as fs from 'fs'
import * as path from 'path'
import parser from '@/parse'
import Tree from './build/tree'
import Routes from './build/routes'

const now = Date.now

export default options => {
  const {
    buildDebounce = 50,
    write: { routes: writeRoutes, tree: writeTree } = {},
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
  let buildPromise = Promise.resolve()
  let idlePromise = Promise.resolve()
  let startTime = null

  const isIdle = () => started && timeout === null && !scheduled && !running

  const targetsDisplayNames = [writeRoutes, writeTree]
    .filter(Boolean)
    .map(x => path.basename(x))
    .join(', ')

  const logBuildSuccess = () => {
    const duration = now() - startTime
    startTime = null
    // eslint-disable-next-line no-console
    console.info(`[routix] Written: ${targetsDisplayNames} (${duration}ms)`)
  }

  const build = () => {
    if (!routes && !tree) {
      return Promise.resolve()
    }

    running = true

    const extra = tree ? tree.prepare() : null

    const _routes = routes.generate(extra)

    const promises = []

    if (writeRoutes) {
      const contents = [
        `${_routes}`,
        `f.dirs = d`, // to avoid Rollup's mixed default/named exports warning
        `export default f\n`,
      ].join('\n\n')
      promises.push(fs.promises.writeFile(writeRoutes, contents, 'utf8'))
    }

    if (writeTree) {
      const _tree = tree.generate()
      const prefix = writeRoutes
        ? `import f from '${writeRoutes}'\n\nconst d = f.dirs`
        : _routes
      const contents = prefix + '\n\n' + _tree
      promises.push(fs.promises.writeFile(writeTree, contents, 'utf8'))
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

  const invalidate = () => {
    if (!started) return
    if (timeout !== null) clearTimeout(timeout)
    idlePromise = new Promise((resolve, reject) => {
      timeout = setTimeout(
        () => schedule().then(resolve, reject),
        buildDebounce
      )
      notifyChange()
    })
  }

  const input = () => {
    if (startTime === null) startTime = now()
  }

  const start = () => {
    input()
    started = true
    invalidate()
  }

  const _parse = pathStats => {
    const [path] = pathStats
    const file = parse(pathStats)
    files[path] = file
    return file
  }

  const add = pathStats => {
    input()
    const file = _parse(pathStats)
    builders.forEach(x => x.add(file))
    invalidate()
  }

  const update = pathStats => {
    input()
    const file = _parse(pathStats)
    builders.forEach(x => x.update(file))
    invalidate()
  }

  const remove = ([path]) => {
    input()
    const file = files[path]
    delete files[path]
    builders.forEach(x => x.remove(file))
    invalidate()
  }

  const onIdle = () => {
    if (isIdle()) return Promise.resolve()
    return Promise.all([idlePromise, buildPromise]).then(onIdle)
  }

  let changeListeners = []

  const notifyChange = () => {
    for (const f of changeListeners) f()
    changeListeners = []
  }

  const onChange = () => new Promise(resolve => changeListeners.push(resolve))

  return { start, add, update, remove, onChange, onIdle }
}
