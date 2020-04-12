import { noop } from '@/util'

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

const _tree = file =>
  `export default {
  path: '',
  root: true,
  children: ${
    file.children.length === 0
      ? '[]'
      : `[\n    ${file.children.map(_ref).join(',\n    ')}\n  ]`
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

    children.forEach(([seg, x]) => unfold(x, _path + seg + '/', virtuals))

    node[FILE].children = children.map(([, x]) => x[FILE])
  }

  return unfold
}

export default options => {
  const root = {
    [FILE]: { root: true, path: '' },
  }

  const unfold = unfolder(options)

  const add = file => {
    const steps = file.path.split('/')
    // const leaf = steps.pop()
    const node = getNode(root, steps)
    if (node[FILE] && node[FILE].isFile) {
      throw new Error(`File node conflics: ${file.path}`)
    }
    node[FILE] = file
  }

  const remove = path => {
    // DEBUG DEBUG DEBUG
  }

  const prepare = () => {
    const virtuals = []
    unfold(root, '', virtuals)
    return { virtuals }
  }

  const generate = () => _tree(root[FILE])

  return {
    root,

    add,
    update: noop,
    remove,

    prepare,
    generate,
  }
}
