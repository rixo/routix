import { noop, identity } from '@/util'
import { indent, _ref, _props } from './util'

const FILE = Symbol('routix.tree.FILE')

const isFileNode = node => node[FILE] && node[FILE].isFile

const getNode = (from, steps) => {
  let node = from
  for (const step of steps) {
    if (step === '') continue
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
    if (step === '') continue
    if (!cursor[step]) {
      cursor[step] = {}
    }
    cursor = cursor[step]
    nodes.push(cursor)
  }
  return nodes
}

const _tree = (format, rootPath, root) =>
  indent(0, '', [
    `export default {`,
    indent(1, ',', [
      `path: ${JSON.stringify(rootPath)}`,
      `isRoot: true`,
      ..._props(format(root)),
      root.children.length
        ? indent(1, '', [
            'children: [',
            indent(2, ',', root.children.map(_ref)),
            ']',
          ])
        : 'children: []',
    ]),
    '}',
  ])

const unfolder = options => {
  const { parse = identity, sortChildren = false, cacheChildren } = options

  // const compareChildEntries = ([a], [b]) => (a === b ? 0 : a < b ? -1 : 1)
  const compareChildEntries = sortChildren && (([a], [b]) => sortChildren(a, b))

  const unfold = (node, _path, dirs) => {
    // --- create directory node (if needed) ---

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

    // --- create children prop (if not cached) ---

    if (!cacheChildren || !file.children) {
      const children = Object.entries(node)

      for (const [seg, x] of children) {
        unfold(x, _path + seg + '/', dirs)
      }

      if (sortChildren) {
        children.sort(compareChildEntries)
      }

      file.children = children.map(([, x]) => x[FILE])
    }

    if (!file.isFile && !file.isRoot) {
      dirs.push(file)
    }
  }

  return unfold
}

export default options => {
  const { format = noop, leadingSlash, cacheChildren = true } = options

  const rootPath = leadingSlash ? '/' : ''

  const root = {
    [FILE]: { isRoot: true, path: rootPath },
  }

  const unfold = unfolder({ ...options, cacheChildren })

  const split = leadingSlash ? x => x.slice(1).split('/') : x => x.split('/')

  const invalidate = file => {
    const steps = split(file.path)
    const nodes = getNodes(root, steps)
    for (const node of nodes) {
      if (node[FILE]) delete node[FILE].children
    }
  }

  const put = (file, replace) => {
    const steps = split(file.path)
    const node = getNode(root, steps)
    if (node[FILE]) {
      if (node[FILE].isRoot) {
        root[FILE] = Object.assign(file, root[FILE])
      } else if (!replace && node[FILE].isFile) {
        throw new Error(`File node conflics: ${file.path}`)
      }
    }
    node[FILE] = file
  }

  const add = file => {
    if (cacheChildren) invalidate(file)
    put(file, false)
  }

  const update = (file, previous) => {
    if (cacheChildren) {
      invalidate(file)
      invalidate(previous)
    }
    put(file, true)
  }

  const remove = file => {
    if (cacheChildren) invalidate(file)
    const steps = split(file.path)
    const nodes = getNodes(root, steps.slice(0, -1))
    let i = steps.length - 1
    do {
      const node = nodes[i]
      delete node[steps[i]]
      if (isFileNode(node)) break
      if (Object.keys(node).length > 0) break
      i--
    } while (i >= 0)
  }

  const prepare = () => {
    const dirs = []
    unfold(root, '', dirs)
    return dirs
  }

  const generate = () => _tree(format, rootPath, root[FILE])

  return {
    add,
    update,
    remove,

    prepare,
    generate,
  }
}
