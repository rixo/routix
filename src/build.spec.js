import { test } from 'zorax'
import dedent from 'dedent'

import builder from './build'

const nope = () => false
const yup = () => true

/* eslint-disable */
const _routes = (_, files) => {
  console.log(files.routes)
  process.exit()
}

const _tree = (_, files) => {
  console.log(files.tree)
  process.exit()
}
/* eslint-enable */

const macro = async (t, { write, ...options }, ...steps) => {
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
  for (const step of steps) {
    if (typeof step === 'function') {
      i++
      await step(build, files)
      await build.onIdle()
    } else if (typeof step === 'string') {
      t.eq(files.routes.trim(), dedent(step), `routes (step ${i})`)
    } else {
      if (step.hasOwnProperty('routes')) {
        t.eq(
          files.routes && files.routes.trim(),
          step.routes && dedent(step.routes),
          `routes (step ${i})`
        )
      }
      if (step.hasOwnProperty('tree')) {
        t.eq(
          files.tree && files.tree.trim(),
          step.tree && dedent(step.tree),
          `tree (step ${i})`
        )
      }
    }
  }
}

test(
  'basic',
  macro,
  {},
  build => {
    build.add(['a.js', { isDirectory: nope }])
    build.add(['foo/b.js', { isDirectory: nope }])
    build.start()
  },
  {
    routes: `
      const f /* files */ = [
        {
          path: "a",
          import: () => import("/pages/a.js")
        },
        {
          path: "foo/b",
          import: () => import("/pages/foo/b.js")
        }
      ]

      const d /* dirs */ = [
        {
          path: "foo",
          children: () => [f[1]]
        }
      ]

      for (const g of [f, d])
        for (const x of g) x.children = x.children ? x.children() : []

      f.dirs = d

      export default f
    `,
    tree: `
      import f from 'routes'

      const d = f.dirs

      export default {
        path: "",
        isRoot: true,
        children: [
          f[0],
          d[0]
        ]
      }
    `,
  }
)

test(
  'importDefault',
  macro,
  { importDefault: true },
  build => {
    build.add(['a.js', { isDirectory: nope }])
    build.add(['foo/b.js', { isDirectory: nope }])
    build.start()
  },
  {
    routes: `
      const dft = m => m.default

      const f /* files */ = [
        {
          path: "a",
          import: () => import("/pages/a.js").then(dft)
        },
        {
          path: "foo/b",
          import: () => import("/pages/foo/b.js").then(dft)
        }
      ]

      const d /* dirs */ = [
        {
          path: "foo",
          children: () => [f[1]]
        }
      ]

      for (const g of [f, d])
        for (const x of g) x.children = x.children ? x.children() : []

      f.dirs = d

      export default f
    `,
    tree: `
      import f from 'routes'

      const d = f.dirs

      export default {
        path: "",
        isRoot: true,
        children: [
          f[0],
          d[0]
        ]
      }
    `,
  }
)

test(
  'only routes',
  macro,
  {
    write: { tree: false },
  },
  build => {
    build.add(['a.js', { isDirectory: nope }])
    build.add(['foo/b.js', { isDirectory: nope }])
    build.start()
  },
  {
    routes: `
      const f /* files */ = [
        {
          path: "a",
          import: () => import("/pages/a.js")
        },
        {
          path: "foo/b",
          import: () => import("/pages/foo/b.js")
        }
      ]

      export default f
    `,
    tree: undefined,
  }
)

test(
  'only tree',
  macro,
  { write: { routes: false } },
  build => {
    build.add(['a.js', { isDirectory: nope }])
    build.add(['foo/b.js', { isDirectory: nope }])
    build.start()
  },
  {
    routes: undefined,
    tree: `
      const f /* files */ = [
        {
          path: "a",
          import: () => import("/pages/a.js")
        },
        {
          path: "foo/b",
          import: () => import("/pages/foo/b.js")
        }
      ]

      const d /* dirs */ = [
        {
          path: "foo",
          children: () => [f[1]]
        }
      ]

      for (const g of [f, d])
        for (const x of g) x.children = x.children ? x.children() : []

      export default {
        path: "",
        isRoot: true,
        children: [
          f[0],
          d[0]
        ]
      }
    `,
  }
)

test(
  'nesting',
  macro,
  {
    parse: x => {
      x.path = x.path.replace(/\./g, '/')
    },
  },
  build => {
    build.add(['foo', { isDirectory: yup }])
    build.add(['foo/bar.baz.js', { isDirectory: nope }])
    build.start()
  },
  `
    const f /* files */ = [
      {
        path: "foo/bar/baz",
        import: () => import("/pages/foo/bar.baz.js")
      }
    ]

    const d /* dirs */ = [
      {
        path: "foo/bar",
        children: () => [f[0]]
      },
      {
        path: "foo",
        children: () => [d[0]]
      }
    ]

    for (const g of [f, d])
      for (const x of g) x.children = x.children ? x.children() : []

    f.dirs = d

    export default f
  `,
  build => {
    build.remove(['foo/bar.baz.js', { isDirectory: nope }])
  },
  `
    const f /* files */ = []

    const d /* dirs */ = []

    for (const g of [f, d])
      for (const x of g) x.children = x.children ? x.children() : []

    f.dirs = d

    export default f
  `
)

test(
  'delete nested',
  macro,
  {},
  build => {
    build.add(['foo/bar.js', { isDirectory: nope }])
    build.add(['foo', { isDirectory: yup }])
    build.add(['baz.js', { isDirectory: nope }])
    build.start()
  },
  {
    tree: `
      import f from 'routes'

      const d = f.dirs

      export default {
        path: "",
        isRoot: true,
        children: [
          f[1],
          d[0]
        ]
      }
    `,
    routes: `
      const f /* files */ = [
        {
          path: "foo/bar",
          import: () => import("/pages/foo/bar.js")
        },
        {
          path: "baz",
          import: () => import("/pages/baz.js")
        }
      ]

      const d /* dirs */ = [
        {
          path: "foo",
          children: () => [f[0]]
        }
      ]

      for (const g of [f, d])
        for (const x of g) x.children = x.children ? x.children() : []

      f.dirs = d

      export default f
    `,
  },
  build => {
    build.remove(['foo/bar.js', { isDirectory: nope }])
  },
  {
    routes: `
      const f /* files */ = [
        {
          path: "baz",
          import: () => import("/pages/baz.js")
        }
      ]

      const d /* dirs */ = []

      for (const g of [f, d])
        for (const x of g) x.children = x.children ? x.children() : []

      f.dirs = d

      export default f
    `,
    tree: `
      import f from 'routes'

      const d = f.dirs

      export default {
        path: "",
        isRoot: true,
        children: [
          f[0]
        ]
      }
    `,
  },
  build => {
    build.add(['foo/baz.js', { isDirectory: nope }])
  },
  {
    routes: `
      const f /* files */ = [
        {
          path: "baz",
          import: () => import("/pages/baz.js")
        },
        {
          path: "foo/baz",
          import: () => import("/pages/foo/baz.js")
        }
      ]

      const d /* dirs */ = [
        {
          path: "foo",
          children: () => [f[1]]
        }
      ]

      for (const g of [f, d])
        for (const x of g) x.children = x.children ? x.children() : []

      f.dirs = d

      export default f
    `,
    tree: `
      import f from 'routes'

      const d = f.dirs

      export default {
        path: "",
        isRoot: true,
        children: [
          f[0],
          d[0]
        ]
      }
    `,
  }
)

test(
  'adding to existing dir',
  macro,
  {},
  build => {
    build.add(['foo', { isDirectory: yup }])
    build.add(['foo/bar.js', { isDirectory: nope }])
    build.add(['baz.js', { isDirectory: nope }])
    build.start()
  },
  {
    routes: `
      const f /* files */ = [
        {
          path: "foo/bar",
          import: () => import("/pages/foo/bar.js")
        },
        {
          path: "baz",
          import: () => import("/pages/baz.js")
        }
      ]

      const d /* dirs */ = [
        {
          path: "foo",
          children: () => [f[0]]
        }
      ]

      for (const g of [f, d])
        for (const x of g) x.children = x.children ? x.children() : []

      f.dirs = d

      export default f
    `,
    tree: `
      import f from 'routes'

      const d = f.dirs

      export default {
        path: "",
        isRoot: true,
        children: [
          f[1],
          d[0]
        ]
      }
    `,
  },
  build => {
    build.add(['foo/bat.js', { isDirectory: nope }])
  },
  {
    routes: `
      const f /* files */ = [
        {
          path: "foo/bar",
          import: () => import("/pages/foo/bar.js")
        },
        {
          path: "baz",
          import: () => import("/pages/baz.js")
        },
        {
          path: "foo/bat",
          import: () => import("/pages/foo/bat.js")
        }
      ]

      const d /* dirs */ = [
        {
          path: "foo",
          children: () => [f[0], f[2]]
        }
      ]

      for (const g of [f, d])
        for (const x of g) x.children = x.children ? x.children() : []

      f.dirs = d

      export default f
    `,
    tree: `
      import f from 'routes'

      const d = f.dirs

      export default {
        path: "",
        isRoot: true,
        children: [
          f[1],
          d[0]
        ]
      }
    `,
  }
)

test(
  'virtual paths',
  macro,
  {
    parse: x => {
      x.path = x.path.replace(/\./g, '/')
    },
  },
  build => {
    build.add(['a', { isDirectory: yup }])
    build.add(['a/b.c.d.js', { isDirectory: nope }])
    build.start()
  },
  {
    tree: `
      import f from 'routes'

      const d = f.dirs

      export default {
        path: "",
        isRoot: true,
        children: [
          d[2]
        ]
      }
    `,
    routes: `
      const f /* files */ = [
        {
          path: "a/b/c/d",
          import: () => import("/pages/a/b.c.d.js")
        }
      ]

      const d /* dirs */ = [
        {
          path: "a/b/c",
          children: () => [f[0]]
        },
        {
          path: "a/b",
          children: () => [d[0]]
        },
        {
          path: "a",
          children: () => [d[1]]
        }
      ]

      for (const g of [f, d])
        for (const x of g) x.children = x.children ? x.children() : []

      f.dirs = d

      export default f
    `,
  },
  build => {
    build.remove(['a/b.c.d.js', { isDirectory: nope }])
    build.add(['a/b.d.js', { isDirectory: nope }])
  },
  {
    tree: `
      import f from 'routes'

      const d = f.dirs

      export default {
        path: "",
        isRoot: true,
        children: [
          d[1]
        ]
      }
    `,
    routes: `
      const f /* files */ = [
        {
          path: "a/b/d",
          import: () => import("/pages/a/b.d.js")
        }
      ]

      const d /* dirs */ = [
        {
          path: "a/b",
          children: () => [f[0]]
        },
        {
          path: "a",
          children: () => [d[0]]
        }
      ]

      for (const g of [f, d])
        for (const x of g) x.children = x.children ? x.children() : []

      f.dirs = d

      export default f
    `,
  }
)
