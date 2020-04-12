import * as path from 'path'
import { identity } from '@/util'

const defaultRoutesPath = path.resolve(__dirname, './routes.js')
const defaultTreePath = path.resolve(__dirname, './tree.js')

const parseExtensions = (extensions = []) => {
  if (!extensions) return extensions
  return extensions.map(ext => (!ext.startsWith('.') ? '.' + ext : ext))
}

export const parseOptions = ({
  dir,
  extensions = [],
  write,
  watchDelay = 20,
  parse = identity,
  leadingSlash = false,
} = {}) => ({
  watchDelay,
  dir: dir && path.resolve(dir),
  extensions: parseExtensions(extensions),
  /**
   * Files:
   *
   *     ({ isFile: true, absolute, relative, path, extension }) => item | undefined
   *
   * Directories:
   *
   *     ({ isFile: false, absolute, relative, path }) => item | undefined
   *
   * Virtual directories (when building tree from modified paths):
   *
   *     ({ isVirtual: true, path }) => item | undefined
   */
  parse,
  leadingSlash,
  write: {
    routes:
      !write ||
      write === true ||
      !write.hasOwnProperty('routes') ||
      write.routes === true
        ? defaultRoutesPath
        : path.resolve(write.routes),
    tree:
      !write ||
      write === true ||
      !write.hasOwnProperty('tree') ||
      write.tree === true
        ? defaultTreePath
        : path.resolve(write.tree),
  },
})
