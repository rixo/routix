import * as path from 'path'
import { identity } from '@/util'
import findup from '@/util/findup'

// we need to find up because we're probably in /dist
let _root
const root = () =>
  _root || (_root = path.dirname(findup(__dirname, 'package.json')))
const defaultRoutesPath = () => path.resolve(root(), 'routes.js')
const defaultTreePath = () => path.resolve(root(), 'tree.js')

const parseExtensions = (extensions = []) => {
  if (!extensions) return extensions
  return extensions.map(ext => (!ext.startsWith('.') ? '.' + ext : ext))
}

const emptyObject = {}

/* eslint-disable no-console */
const defaultLogger = {
  log: console.log.bind(console, '[routix]'),
  info: console.info.bind(console, '[routix]'),
  error: console.error.bind(console, '[routix]'),
}
/* eslint-enable no-console */

export const parseOptions = ({
  /**
   * @type {string}
   */
  dir,

  /**
   * @type {string[]}
   */
  extensions = [],

  /**
   * @type {bool | { routes: bool|string, tree: bool|string }}
   *
   *     write: true|false
   *
   *     write: { routes: true|false, tree: true|false }
   *
   *     write: { routes: '/path/to/file', tree: '' }
   */
  write,

  /**
   * @type {bool}
   *
   * Whether to watch FS after initial build.
   *
   * NOTE When used in Rollup, this option is set automatically by the plugin,
   * based on the ROLLUP_WATCH env variable (it can be overridden, but it's
   * probably not what you want).
   */
  watch = null,

  /**
   * @type {int|falsy}
   *
   * Defer Rollup build by this duration (ms); this is needed to ensure that
   * our file watcher has the time to pick file changes (and then holds Rollup
   * until routes.js is generated).
   *
   * NOTE This is only useful when used as a bundler (Rollup) plugin.
   */
  watchDelay = 40,

  /**
   * @type {bool} Prepend paths with a leading slash
   */
  leadingSlash = false,

  /**
   * @type {bool} Import default import
   */
  importDefault = false,

  /**
   * @type {string} Name of the import property in route objects
   */
  importProp = 'import',

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
   * @type {({ isFile: bool, path: string }) => object}
   *
   * item => props
   */
  format = () => emptyObject,

  /**
   * @type {bool} `true` to auto start Routix (only with node API)
   */
  start = false,

  // --- Advanced ---

  /**
   * @type {int} Number of ms to wait for a possible new event before starting
   * the build process.
   */
  buildDebounce = 50,

  /**
   * @type {object} Custom logger (with `console` API)
   */
  log = defaultLogger,

  /**
   * @type {function} Custom file writer: `async (name, contents) => {}`
   */
  writeFile,
} = {}) => ({
  watchDelay,
  dir: dir && path.resolve(dir),
  extensions: parseExtensions(extensions),
  watch,
  leadingSlash,
  importDefault,
  importProp,
  parse,
  format,
  write: {
    routes:
      !write ||
      write === true ||
      !write.hasOwnProperty('routes') ||
      write.routes === true
        ? defaultRoutesPath()
        : path.resolve(write.routes),
    tree:
      !write ||
      write === true ||
      !write.hasOwnProperty('tree') ||
      write.tree === true
        ? defaultTreePath()
        : path.resolve(write.tree),
  },
  start,
  // internal (for testing)
  writeFile,
  buildDebounce,
  log,
})
