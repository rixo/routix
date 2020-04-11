import { split } from '@/util'
import { isFile } from '@/model'

import { _ref } from './util'

const _ = JSON.stringify

const _file = ({ absolute, path, segment, sortKey, title }) => `
  {
    path: ${_(path)},
    component: () => import(${_(absolute)}).then(m => m.default),
    segment: ${_(segment)},
    sortKey: ${_(sortKey)},
    title: ${_(title)},
  }`

const _dir = ({ path, segment, sortKey, title, children }) => `
  {
    path: ${_(path)},
    segment: ${_(segment)},
    sortKey: ${_(sortKey)},
    title: ${_(title)},${children &&
  `
    get children() {
      delete this.children
      return this.children = [${children.map(_ref).join(', ')}]
    }`}
  }`

const _generate = (files, dirs) =>
  [
    `const d /* dirs */ = [${dirs.map(_dir).join(',')}\n]`,
    `const f /* files */ = [${files.map(_file).join(',')}\n]`,
  ]
    .filter(x => x != null)
    .join('\n\n')

const addIndex = (x, i) => (x.i = i)

export default (/* options */) => {
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
    return _generate(files, dirs)
  }

  return {
    add,
    update: add,
    remove,

    generate,
  }
}
