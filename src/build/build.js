import * as fs from 'fs'
import Tree from './build/tree'
import Routes from './build/routes'
import parser from './parse'

export default options => {
  const {
    buildDebounce = 50,
    write: { routes: writeRoutes, tree: writeTree } = {},
  } = options

  const tree = writeTree && Tree(options)
  const routes = (writeRoutes || writeTree) && Routes(options)

  const builders = [routes, tree].filter(Boolean)

  const parse = parser(options)

  let timeout = null
  let promise = null
  let scheduled = false

  const build = () => {
    if (!routes && !tree) {
      return Promise.resolve()
    }

    const extra = tree ? tree.prepare() : null

    const _routes = routes.generate(extra)

    const promises = []

    if (writeRoutes) {
      const contents = `${_routes}\n\nexport default f\n`
      promises.push(fs.promises.writeFile(writeRoutes, contents, 'utf8'))
    }

    if (writeTree) {
      const _tree = tree.generate()
      const prefix = writeRoutes
        ? `import { files as f, dirs as d } from '${writeRoutes}'`
        : _routes
      const contents = prefix + '\n\n' + _tree
      promises.push(fs.promises.writeFile(writeTree, contents, 'utf8'))
    }

    return Promise.all(promises)
  }

  const schedule = () => {
    if (scheduled) return
    scheduled = true
    promise = Promise.resolve(promise)
      .finally(() =>
        build().catch(err => {
          // eslint-disable-next-line no-console
          console.error(err)
        })
      )
      .finally(() => {
        scheduled = false
      })
  }

  const invalidate = () => {
    clearTimeout(timeout)
    timeout = setTimeout(schedule, buildDebounce)
  }

  const add = pathStats => {
    const file = parse(pathStats)
    builders.forEach(x => x.add(file))
    invalidate()
  }

  const update = pathStats => {
    const file = parse(pathStats)
    builders.forEach(x => x.update(file))
    invalidate()
  }

  const remove = ([path]) => {
    builders.forEach(x => x.delete(path))
    invalidate()
  }

  return { add, update, remove }
}
