import { split, identity } from '@/util'
import { isFile, notEmpty } from '@/model'

import { _ref } from './util'

const _ = JSON.stringify

const indent = (n, glue, lines) =>
  lines.map(x => (/^\s/.test(x) ? x : '  '.repeat(n) + x)).join(glue)

const _props = (props = {}) =>
  Object.entries(props).map(([prop, value]) => `${_(prop)}: ${_(value)}`)

const _file = (props, { absolute, path }) =>
  indent(1, '\n', [
    '',
    '{',
    indent(2, ',\n', [
      `path: ${_(path)}`,
      `import: () => import(${_(absolute)}).then(dft)`,
      ..._props(props),
    ]),
    '}',
  ])

const _dir = (props, { path, children }) =>
  indent(1, '\n', [
    '',
    '{',
    indent(2, ',\n', [
      `path: ${_(path)}`,
      ..._props(props),
      children && `children: () => [${children.map(_ref).join(', ')}]`,
    ]),
    '}',
  ])

const _generate = (format, files, dirs) =>
  [
    `const dft = m => m.default`,
    `const f /* files */ = [${files
      .map(x => _file(format(x), x))
      .join(',')}\n]`,
    `const d /* dirs */ = [${dirs.map(x => _dir(format(x), x)).join(',')}\n]`,
    `d.forEach(d => { d.children = d.children() })`,
  ].join('\n\n')

const addIndex = (x, i) => (x.i = i)

export default ({ format, keepEmpty }) => {
  const routes = {}

  const add = file => {
    routes[file.path] = file
  }

  const remove = ({ path }) => {
    if (!routes[path]) return
    delete routes[path]
  }

  const filter = keepEmpty ? identity : x => x.filter(notEmpty)

  const generate = ({ virtuals } = {}) => {
    const [files, dirs] = split(isFile, filter(Object.values(routes)))
    dirs.push(...filter(virtuals))
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
