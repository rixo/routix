export { test, describe } from 'zorax'
import dedent from 'dedent'

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

export const buildMacro = builder => async (t, _options, ...steps) => {
  const { write, ...options } =
    typeof _options === 'function' ? _options(t) : _options

  const files = {}

  const dumbSort = ({ path: a }, { path: b }) => (a === b ? 0 : a < b ? -1 : 1)

  t._options = {
    // make tests deterministic
    sortFiles: dumbSort,
    sortDirs: dumbSort,
    sortChildren: dumbSort,

    dir: '/pages',
    extensions: ['.js'],
    merged: false,
    write: {
      routes: '/out/routes',
      tree: '/out/tree',
      ...write,
      ...(write && write.extras === true && { extras: '/out/extras' }),
    },
    log: { info: () => {} },
    buildDebounce: 0,
    writeFile: t.spy((name, contents) => {
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
}
