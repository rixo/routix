import { identity, noop } from '@/util'
import { notEmpty } from '@/model'

import { indent, _ref } from './util'

const _ = JSON.stringify

const _props = (props = {}) =>
  Object.entries(props).map(([prop, value]) => `${_(prop)}: ${_(value)}`)

const _children = children =>
  // NOTE children not here when tree:false
  children && `children: () => [${children.map(_ref).join(', ')}]`

const _file = (props, importDefault, { i, absolute, path, children }) =>
  indent(1, '', [
    `{ // f[${i}]`,
    indent(2, ',', [
      `path: ${_(path)}`,
      `import: () => import(${_(absolute)})${
        importDefault ? '.then(dft)' : ''
      }`,
      ..._props(props),
      children && children.length > 0 && _children(children),
    ]),
    '}',
  ])

const _dir = (props, { i, path, children }) =>
  indent(1, '', [
    `{ // d[${i}]`,
    indent(2, ',', [`path: ${_(path)}`, ..._props(props), _children(children)]),
    '}',
  ])

const _generate = ({ format, importDefault }, files, dirs) =>
  indent(0, '\n', [
    importDefault && `const dft = m => m.default`,

    indent.collapse(0, '', [
      'const f /* files */ = [',
      indent(1, ',')(files.map(x => _file(format(x), importDefault, x))),
      ']',
    ]),

    dirs &&
      indent.collapse(0, '', [
        'const d /* dirs */ = [',
        indent(1, ',')(dirs.map(x => _dir(format(x), x))),
        ']',
      ]),

    dirs &&
      indent(0, '', [
        'for (const g of [f, d])',
        indent(1, '', [
          'for (const x of g) x.children = x.children ? x.children() : []',
        ]),
      ]),
  ])

const addIndex = (x, i) => (x.i = i)

export default ({ format = noop, keepEmpty, importDefault = false }) => {
  const routes = {}

  const add = file => {
    routes[file.path] = file
  }

  const remove = ({ path }) => {
    if (!routes[path]) return
    delete routes[path]
  }

  const filter = keepEmpty ? identity : x => x.filter(notEmpty)

  const generate = (dirs = []) => {
    const files = filter(Object.values(routes))
    files.forEach(addIndex)
    if (dirs) dirs.forEach(addIndex)
    return _generate({ format, importDefault }, files, dirs)
  }

  return {
    add,
    update: add,
    remove,

    generate,
  }
}
