import * as path from 'path'
import { escapeRe } from '@/util'

const orderPrefixRegex = /(\/|^)[\d-]+_*(?=[^\d-/][^/]*(\/|$))/g

const parseFile = ({ dir, extensions }) => ([relative, stats]) => {
  const item = {
    relative,
    absolute: path.join(dir, relative),
    isFile: !stats.isDirectory(),
  }

  if (item.isFile) {
    const ext =
      extensions.find(x => relative.endsWith(x)) || path.extname(relative)
    item.extension = ext
    item.path = ext ? relative.slice(0, -ext.length) : relative
  } else {
    item.path = relative
  }

  // item.path = '/' + item.path

  // drop file extensions
  item.path = item.path.replace(
    new RegExp(
      `((?:^|/)[^/]+)(?:${extensions.map(escapeRe).join('|')})(/|$)`,
      'g'
    ),
    '$1$2'
  )

  // . => /
  item.path = item.path.replace(/\./g, '/')

  // order prefix 00-
  const basename = path.basename(item.path)
  item.sortKey = basename
  if (!/^[\d-]*_*$/.test(basename)) {
    item.path = item.path.replace(orderPrefixRegex, '$1')
    item.segment = basename.replace(orderPrefixRegex, '$1')
  } else {
    item.segment = basename
  }

  item.title = item.segment.replace(/_+/, ' ')

  return item
}

export default parseFile
