import * as fs from 'fs'
import * as fse from 'fs-extra'
import * as path from 'path'
import * as crypto from 'crypto'
import { fileURLToPath } from 'url'

export { test, describe } from 'zorax'
import dedent from 'dedent'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const tmp = path.resolve(__dirname, '../tmp')

if (!fs.existsSync(tmp)) {
  fs.mkdirSync(tmp)
}

/* eslint-disable */
export const _routes = (_, files) => {
  console.log(files['/out/routes'])
  process.exit()
}

export const _tree = (_, files) => {
  console.log(files['/out/tree'])
  process.exit()
}
/* eslint-enable */

const freeDir = async (prefix = 'f') => {
  let watchdog = 100
  while (true) {
    if (!--watchdog) {
      throw new Error('Failed to find a free fixture dir name')
    }
    const suffix = crypto
      .randomBytes(6)
      .readUIntLE(0, 6)
      .toString(36)
    const dir = path.resolve(tmp, prefix + suffix)
    if (await fse.pathExists(dir)) continue
    return dir
  }
}

export const buildMacro = builder => async (t, _options, ...steps) => {
  const { write, ...options } =
    typeof _options === 'function' ? _options(t) : _options

  const files = {}

  const dumbSort = ({ path: a }, { path: b }) => (a === b ? 0 : a < b ? -1 : 1)

  const root = await freeDir()

  t._options = {
    // make tests deterministic
    sortFiles: dumbSort,
    sortDirs: dumbSort,
    sortChildren: dumbSort,

    dir: path.join(root, 'pages'),
    extensions: ['.js', '.jsx'],
    merged: false,
    write: {
      routes: path.join(root, 'out/routes'),
      tree: path.join(root, 'out/tree'),
      ...write,
      ...(write && write.extras === true && { extras: '/out/extras' }),
    },
    log: { info: () => {} },
    buildDebounce: 0,
    writeFile: t.spy((file, contents) => {
      const name = file.replace(root, '')
      let last
      do {
        last = contents
        contents = contents.replace(root, '')
      } while (contents !== last)
      files[name] = contents
    }),
    ...options,
  }

  const build = builder(t._options)

  let i = -1
  for (const step of steps.flat()) {
    if (typeof step === 'function') {
      i++
      await step(build, files, t)
      await build.onIdle()
    } else if (typeof step === 'string') {
      const actual = files['/out/routes'] && files['/out/routes'].trim()
      const expected = dedent(step)
      t.eq(actual, expected, `routes #${i}`)
    } else {
      if (step.hasOwnProperty('routes')) {
        const actual = files['/out/routes'] && files['/out/routes'].trim()
        const expected = step.routes && dedent(step.routes)
        t.eq(actual, expected, `routes #${i}`)
      }
      if (step.hasOwnProperty('tree')) {
        const actual = files['/out/tree'] && files['/out/tree'].trim()
        const expected = step.tree && dedent(step.tree)
        t.eq(actual, expected, `tree #${i}`)
      }
      if (step.hasOwnProperty('extras')) {
        const actual = files['/out/extras'] && files['/out/extras'].trim()
        const expected = step.extras && dedent(step.extras)
        t.eq(actual, expected, `extras #${i}`)
      }
    }
  }

  await fse.remove(root)
}
