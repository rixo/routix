import * as path from 'path'
import { identity } from '@/util'

const parseFile = options => ([relative, stats]) => {
  const { dir, extensions, leadingSlash, parse = identity } = options

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

  if (leadingSlash) {
    item.path = '/' + item.path
  }

  // user parse is allowed to either return a new object, or mutate
  return parse(item, options) || item
}

export default parseFile
