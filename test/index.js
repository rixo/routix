export { test, describe } from 'zorax'
import dedent from 'dedent'

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
    buildDebounce: 0,
    writeFile: (name, contents) => {
      files[name] = contents
    },
    write: {
      routes: 'routes',
      tree: 'tree',
      ...write,
    },
    log: {
      info: () => {},
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
      t.eq(files.routes.trim(), dedent(step), `routes #${i}`)
    } else {
      if (step.hasOwnProperty('routes')) {
        t.eq(
          files.routes && files.routes.trim(),
          step.routes && dedent(step.routes),
          `routes #${i}`
        )
      }
      if (step.hasOwnProperty('tree')) {
        t.eq(
          files.tree && files.tree.trim(),
          step.tree && dedent(step.tree),
          `tree #${i}`
        )
      }
    }
  }
}
