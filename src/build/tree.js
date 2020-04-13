import { noop, pipe, identity } from '@/util'
import { notEmpty } from '@/model'
import { indent, _ref } from './util'

const FILE = Symbol('routix.tree.FILE')

const getNode = (from, steps) => {
  let node = from
  for (const step of steps) {
    if (!node[step]) {
      node[step] = {}
    }
    node = node[step]
  }
  return node
}

const getNodes = (from, steps) => {
  const nodes = [from]
  let cursor = from
  for (const step of steps) {
    if (!cursor[step]) {
      cursor[step] = {}
    }
    cursor = cursor[step]
    nodes.push(cursor)
  }
  return nodes
}

const _tree = rootPath => children =>
  indent(0, '', [
    `export default {`,
    indent(1, ',', [
      `path: ${JSON.stringify(rootPath)}`,
      `isRoot: true`,
      children.length
        ? indent(1, '', [
            'children: [',
            indent(2, ',', children.map(_ref)),
            ']',
          ])
        : 'children: []',
    ]),
    '}',
  ])

const unfolder = options => {
  const { parse = identity, sortChildren = false } = options

  // const compareChildEntries = ([a], [b]) => (a === b ? 0 : a < b ? -1 : 1)
  const compareChildEntries = sortChildren && (([a], [b]) => sortChildren(a, b))

  const unfold = (node, _path, dirs) => {
    const children = Object.entries(node)

    if (!node[FILE]) {
      const p = _path.slice(0, -1)
      const file = {
        isFile: false,
        path: p,
      }
      parse(file, options)
      node[FILE] = file
    }

    const file = node[FILE]

    let hasFiles = false
    for (const [seg, x] of children) {
      const hasChildrenFiles = unfold(x, _path + seg + '/', dirs)
      hasFiles = hasFiles || hasChildrenFiles
    }

    if (sortChildren) {
      children.sort(compareChildEntries)
    }

    file.children = children.map(([, x]) => x[FILE])

    file.isEmpty = !file.isFile && !hasFiles

    if (!file.isFile && !file.isRoot && !file.isEmpty) {
      dirs.push(file)
    }

    return !file.isEmpty
  }

  return unfold
}

export default options => {
  const { keepEmpty, leadingSlash } = options

  const root = {
    [FILE]: { isRoot: true, path: '' },
  }

  const unfold = unfolder(options)

  const add = file => {
    const steps = file.path.split('/')
    const node = getNode(root, steps)
    if (node[FILE] && node[FILE].isFile) {
      throw new Error(`File node conflics: ${file.path}`)
    }
    node[FILE] = file
  }

  const remove = file => {
    const steps = file.path.split('/')
    const nodes = getNodes(root, steps.slice(0, -1))
    let i = steps.length - 1
    do {
      delete nodes[i][steps[i]]
      if (Object.keys(nodes[i]).length > 0) break
      i--
    } while (i >= 0)
  }

  const prepare = () => {
    const dirs = []
    unfold(root, '', dirs)
    return dirs
  }

  const filter = keepEmpty ? identity : x => x.filter(notEmpty)

  const _generate = pipe(filter, _tree(leadingSlash ? '/' : ''))

  const generate = () => _generate(root[FILE].children)

  return {
    root,

    add,
    update: noop,
    remove,

    prepare,
    generate,
  }
}
