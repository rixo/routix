import * as path from 'path'
import { identity } from '@/util'

const defaultRoutesPath = path.resolve(__dirname, './routes.js')
const defaultTreePath = path.resolve(__dirname, './tree.js')

const parseExtensions = (extensions = []) => {
  if (!extensions) return extensions
  return extensions.map(ext => (!ext.startsWith('.') ? '.' + ext : ext))
}

const emptyObject = {}

export const parseOptions = ({
  dir,
  extensions = [],
  /**
   *     write: true|false
   *
   *     write: { routes: true|false, tree: true|false }
   *
   *     write: { routes: '/path/to/file', tree: '' }
   */
  write,
  /**
   * {int|falsy} Defer Rollup build by this duration (ms); this is needed to
   * ensure that our file watcher has the time to pick file changes (and then
   * holds Rollup until routes.js is generated)
   */
  watchDelay = 20,
  /**
   * {bool} Prepend paths with a leading slash
   */
  leadingSlash = false,
  /**
   * {bool} Keep empty directories
   */
  keepEmpty = false,
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
  parse = identity,
  /**
   * item => props
   */
  format = () => emptyObject,
} = {}) => ({
  watchDelay,
  dir: dir && path.resolve(dir),
  extensions: parseExtensions(extensions),
  leadingSlash,
  keepEmpty,
  parse,
  format,
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
