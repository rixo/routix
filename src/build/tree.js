import { noop, pipe, identity } from '@/util'
import { notEmpty } from '@/model'
import { _ref } from './util'

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

const _tree = children =>
  `export default {
  path: '',
  root: true,
  children: ${
    children.length === 0
      ? '[]'
      : `[\n    ${children.map(_ref).join(',\n    ')}\n  ]`
  }
}
`

const unfolder = options => {
  const { parse } = options

  const unfold = (node, _path, virtuals) => {
    const children = Object.entries(node)

    if (!node[FILE]) {
      const p = _path.slice(0, -1)
      const file = parse(
        {
          isVirtual: true,
          isFile: false,
          path: p,
        },
        options
      )
      virtuals.push(file)
      node[FILE] = file
    }

    const file = node[FILE]

    let hasFiles = false
    for (const [seg, x] of children) {
      const hasChildrenFiles = unfold(x, _path + seg + '/', virtuals)
      hasFiles = hasFiles || hasChildrenFiles
    }

    file.children = children.map(([, x]) => x[FILE])

    if (!file.isFile && !hasFiles) {
      file.isEmpty = true
      return false
    }

    return true
  }

  return unfold
}

export default options => {
  const { keepEmpty } = options

  const root = {
    [FILE]: { root: true, path: '' },
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
    const leaf = steps.pop()
    const node = getNode(root, steps)
    delete node[leaf]
  }

  const prepare = () => {
    const virtuals = []
    unfold(root, '', virtuals)
    return { virtuals }
  }

  const filter = keepEmpty ? identity : x => x.filter(notEmpty)

  const _generate = pipe(filter, _tree)

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
