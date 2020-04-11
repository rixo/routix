import * as path from 'path'
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

const unfold = (node, _path, virtuals) => {
  const children = Object.entries(node)

  if (!node[FILE]) {
    const p = _path.slice(0, -1)
    const segment = path.basename(p)
    const file = {
      isVirtual: true,
      isFile: false,
      extension: '',
      path: p,
      sortKey: segment,
      segment,
      title: segment.replace(/_+/g, ' '),
    }
    virtuals.push(file)
    node[FILE] = file
  }

  children.forEach(([seg, x]) => unfold(x, _path + seg + '/', virtuals))

  node[FILE].children = children.map(([, x]) => x[FILE])
}

export default () => {
  const root = {
    [FILE]: { root: true, path: '' },
  }

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
