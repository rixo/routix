import { noop } from '@/util'
import { indent, _ref, _props } from './util'

const FILE = Symbol('routix.tree.FILE')

const isFileNode = node => node[FILE] && node[FILE].isFile

const notExcludedFromTree = ([, node]) =>
  !node[FILE] || node[FILE].tree !== false

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
    `const tree = {`,
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

export default (options, { parse, build }) => {
  const {
    leadingSlash,
    format = noop,
    cacheChildren = true,
    sortChildren = false,
    resolveConflict,
  } = options

  const rootPath = leadingSlash ? '/' : ''

  const root = {
    [FILE]: { isRoot: true, path: rootPath },
  }

  const emitDirs = (children, dirs) => {
    children.forEach(file => {
      emitDirs(file.children, dirs)
      if (!file.isFile && !file.isRoot) {
        dirs.push(file)
      }
    })
  }

  const unfold = async (node, _path, dirs) => {
    // --- create directory node (if needed) ---

    if (!node[FILE]) {
      const p = _path.slice(0, -1)
      const file = {
        isFile: false,
        path: p,
      }
      await parse(file, null, options)
      node[FILE] = file
    }

    const file = node[FILE]

    // --- create children prop (if not cached) ---

    if (!cacheChildren || !file.children) {
      const children = Object.entries(node).filter(notExcludedFromTree)

      await Promise.all(
        children.map(([seg, x]) => unfold(x, _path + seg + '/', dirs))
      )

      file.children = children.map(([, x]) => x[FILE])

      if (sortChildren) {
        file.children.sort(sortChildren)
      }
    } else {
      emitDirs(file.children, dirs)
    }

    if (!file.isFile && !file.isRoot) {
      dirs.push(file)
    }
  }

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
      } else {
        const newFile = { ...file }
        const newExisting = { ...node[FILE] }
        if (resolveConflict && resolveConflict(newFile, newExisting)) {
          build.remove(node[FILE])
          build.add(newExisting)
          build.add(newFile)
          return
        }
        if (!replace && node[FILE].isFile) {
          throw new Error(`File node conflict: ${file.path}`)
        }
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
      remove(previous)
      invalidate(file)
    }
    put(file, true)
  }

  const remove = file => {
    if (cacheChildren) invalidate(file)
    const steps = split(file.path)
    const nodes = getNodes(root, steps)
    const target = nodes[nodes.length - 1]
    delete target[FILE]
    let i = nodes.length
    while (i--) {
      const node = nodes[i]
      delete node[steps[i]]
      if (isFileNode(node)) break
      if (Object.keys(node).length > 0) break
    }
  }

  const prepare = async () => {
    const dirs = []
    await unfold(root, rootPath, dirs)
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
