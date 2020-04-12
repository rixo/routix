import { split } from '@/util'
import { isFile } from '@/model'

import { _ref } from './util'

const _ = JSON.stringify

const _props = (props = {}) =>
  Object.entries(props)
    .map(([prop, value]) => `    ${_(prop)}: ${_(value)}`)
    .join(',\n')

const _file = (props, { absolute, path }) => `
  {
    "path": ${_(path)},
    "import": () => import(${_(absolute)}).then(m => m.default),
${_props(props)}
  }`

const _dir = (props, { path, children }) => `
  {
    "path": ${_(path)},
${_props(props)},${children &&
  `
    get children() {
      delete this.children
      return this.children = [${children.map(_ref).join(', ')}]
    }`}
  }`

const _generate = (format, files, dirs) =>
  [
    `const d /* dirs */ = [${dirs.map(x => _dir(format(x), x)).join(',')}\n]`,
    `const f /* files */ = [${files
      .map(x => _file(format(x), x))
      .join(',')}\n]`,
  ]
    .filter(x => x != null)
    .join('\n\n')

const addIndex = (x, i) => (x.i = i)

export default ({ format }) => {
  const routes = {}

  const add = file => {
    routes[file.path] = file
  }

  const remove = path => {
    if (!routes[path]) return
    delete routes[path]
  }

  const generate = ({ virtuals } = {}) => {
    const [files, dirs] = split(isFile, Object.values(routes))
    dirs.push(...virtuals)
    files.forEach(addIndex)
    dirs.forEach(addIndex)
    return _generate(format, files, dirs)
  }

  return {
    add,
    update: add,
    remove,

    generate,
  }
}
