export { test, describe } from 'zorax'
import dedent from 'dedent'

/* eslint-disable */
export const _routes = (_, files) => {
  console.log(files.routes)
  process.exit()
}

export const _tree = (_, files) => {
  console.log(files.tree)
  process.exit()
}
/* eslint-enable */

export const buildMacro = builder => async (
  t,
  { write, ...options },
  ...steps
) => {
  const files = {}

  const build = builder({
    // make tests deterministic
    sortChildren: (a, b) => (a === b ? 0 : a < b ? -1 : 1),
    dir: '/pages',
    extensions: ['.js'],
    write: {
      routes: '/out/routes',
      tree: '/out/tree',
      ...write,
    },
    log: { info: () => {} },
    buildDebounce: 0,
    writeFile: (name, contents) => {
      files[name] = contents
    },
    ...options,
  })

  let i = -1
  for (const step of steps.flat()) {
    if (typeof step === 'function') {
      i++
      await step(build, files)
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
    }
  }
}
