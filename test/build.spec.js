import { test, buildMacro } from '.'
// import { _routes, _tree } from '.'

import builder from '../src/build'

const macro = buildMacro(builder)

const nope = () => false
const yup = () => true

test('basic', macro, {}, [
  build => {
    build.add(['a.js', { isDirectory: nope }])
    build.add(['foo/b.js', { isDirectory: nope }])
    build.start()
  },
  {
    routes: `
      const f /* files */ = [
        { // f[0]
          path: "a",
          import: () => import("/pages/a.js")
        },
        { // f[1]
          path: "foo/b",
          import: () => import("/pages/foo/b.js")
        }
      ]

      const d /* dirs */ = [
        { // d[0]
          path: "foo",
          children: () => [f[1]]
        }
      ]

      for (const g of [f, d])
        for (const x of g) x.children = x.children ? x.children() : []

      const routes = [...f, ...d]

      export { f as files, d as dirs, routes }
    `,
    tree: `
      import { files as f, dirs as d } from '/out/routes'

      const tree = {
        path: "",
        isRoot: true,
        children: [
          f[0],
          d[0]
        ]
      }

      export default tree
    `,
  },
])

test(
  'build errors',
  macro,
  {
    parse: async () => {
      throw new Error('boom')
    },
  },
  [
    async (build, options, t) => {
      build.add(['a.js', { isDirectory: nope }])
      build.add(['foo/b.js', { isDirectory: nope }])
      build.start()
      let err = null
      await build.onIdle().catch(_err => {
        err = _err
      })
      t.ok(err)
      t.ok(err.errors)
      t.eq(err.errors.length, 2)
    },
  ]
)

test('only routes', macro, [
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
        { // f[0]
          path: "a",
          import: () => import("/pages/a.js")
        },
        { // f[1]
          path: "foo/b",
          import: () => import("/pages/foo/b.js")
        }
      ]

      const routes = [...f, ...d]

      export { f as files, d as dirs, routes }
    `,
    tree: undefined,
  },
])

test('only tree', macro, { write: { routes: false } }, [
  build => {
    build.add(['a.js', { isDirectory: nope }])
    build.add(['foo/b.js', { isDirectory: nope }])
    build.start()
  },
  {
    routes: undefined,
    tree: `
      const f /* files */ = [
        { // f[0]
          path: "a",
          import: () => import("/pages/a.js")
        },
        { // f[1]
          path: "foo/b",
          import: () => import("/pages/foo/b.js")
        }
      ]

      const d /* dirs */ = [
        { // d[0]
          path: "foo",
          children: () => [f[1]]
        }
      ]

      for (const g of [f, d])
        for (const x of g) x.children = x.children ? x.children() : []

      const routes = [...f, ...d]

      const tree = {
        path: "",
        isRoot: true,
        children: [
          f[0],
          d[0]
        ]
      }

      export default tree
    `,
  },
])

const parseIndex = x => {
  if (x.path === 'index') x.path = ''
}

test('custom root', macro, { parse: parseIndex }, [
  build => {
    build.add(['index.js', { isDirectory: nope }])
    build.add(['foo.js', { isDirectory: nope }])
    build.start()
  },
  {
    routes: `
      const f /* files */ = [
        { // f[0]
          path: "",
          import: () => import("/pages/index.js"),
          children: () => [f[1]]
        },
        { // f[1]
          path: "foo",
          import: () => import("/pages/foo.js")
        }
      ]

      const d /* dirs */ = []

      for (const g of [f, d])
        for (const x of g) x.children = x.children ? x.children() : []

      const routes = [...f, ...d]

      export { f as files, d as dirs, routes }
    `,
    tree: `
      import { files as f, dirs as d } from '/out/routes'

      const tree = {
        path: "",
        isRoot: true,
        children: [
          f[1]
        ]
      }

      export default tree
    `,
  },
])

const parseVirtual = x => {
  x.path = x.path.replace(/\./g, '/')
}

test('nesting', macro, { parse: parseVirtual }, [
  build => {
    build.add(['foo', { isDirectory: yup }])
    build.add(['foo/bar.baz.js', { isDirectory: nope }])
    build.start()
  },
  `
    const f /* files */ = [
      { // f[0]
        path: "foo/bar/baz",
        import: () => import("/pages/foo/bar.baz.js")
      }
    ]

    const d /* dirs */ = [
      { // d[0]
        path: "foo",
        children: () => [d[1]]
      },
      { // d[1]
        path: "foo/bar",
        children: () => [f[0]]
      }
    ]

    for (const g of [f, d])
      for (const x of g) x.children = x.children ? x.children() : []

    const routes = [...f, ...d]

    export { f as files, d as dirs, routes }
  `,
  build => {
    build.remove(['foo/bar.baz.js', { isDirectory: nope }])
  },
  `
    const f /* files */ = []

    const d /* dirs */ = []

    for (const g of [f, d])
      for (const x of g) x.children = x.children ? x.children() : []

    const routes = [...f, ...d]

    export { f as files, d as dirs, routes }
  `,
])

test('delete nested', macro, {}, [
  build => {
    build.add(['foo/bar.js', { isDirectory: nope }])
    build.add(['foo', { isDirectory: yup }])
    build.add(['baz.js', { isDirectory: nope }])
    build.start()
  },
  {
    tree: `
      import { files as f, dirs as d } from '/out/routes'

      const tree = {
        path: "",
        isRoot: true,
        children: [
          f[0],
          d[0]
        ]
      }

      export default tree
    `,
    routes: `
      const f /* files */ = [
        { // f[0]
          path: "baz",
          import: () => import("/pages/baz.js")
        },
        { // f[1]
          path: "foo/bar",
          import: () => import("/pages/foo/bar.js")
        }
      ]

      const d /* dirs */ = [
        { // d[0]
          path: "foo",
          children: () => [f[1]]
        }
      ]

      for (const g of [f, d])
        for (const x of g) x.children = x.children ? x.children() : []

      const routes = [...f, ...d]

      export { f as files, d as dirs, routes }
    `,
  },
  build => {
    build.remove(['foo/bar.js', { isDirectory: nope }])
  },
  {
    routes: `
      const f /* files */ = [
        { // f[0]
          path: "baz",
          import: () => import("/pages/baz.js")
        }
      ]

      const d /* dirs */ = []

      for (const g of [f, d])
        for (const x of g) x.children = x.children ? x.children() : []

      const routes = [...f, ...d]

      export { f as files, d as dirs, routes }
    `,
    tree: `
      import { files as f, dirs as d } from '/out/routes'

      const tree = {
        path: "",
        isRoot: true,
        children: [
          f[0]
        ]
      }

      export default tree
    `,
  },
  build => {
    build.add(['foo/baz.js', { isDirectory: nope }])
  },
  {
    routes: `
      const f /* files */ = [
        { // f[0]
          path: "baz",
          import: () => import("/pages/baz.js")
        },
        { // f[1]
          path: "foo/baz",
          import: () => import("/pages/foo/baz.js")
        }
      ]

      const d /* dirs */ = [
        { // d[0]
          path: "foo",
          children: () => [f[1]]
        }
      ]

      for (const g of [f, d])
        for (const x of g) x.children = x.children ? x.children() : []

      const routes = [...f, ...d]

      export { f as files, d as dirs, routes }
    `,
    tree: `
      import { files as f, dirs as d } from '/out/routes'

      const tree = {
        path: "",
        isRoot: true,
        children: [
          f[0],
          d[0]
        ]
      }

      export default tree
    `,
  },
])

test('adding to existing dir', macro, {}, [
  build => {
    build.add(['foo', { isDirectory: yup }])
    build.add(['foo/bar.js', { isDirectory: nope }])
    build.add(['baz.js', { isDirectory: nope }])
    build.start()
  },
  {
    routes: `
      const f /* files */ = [
        { // f[0]
          path: "baz",
          import: () => import("/pages/baz.js")
        },
        { // f[1]
          path: "foo/bar",
          import: () => import("/pages/foo/bar.js")
        }
      ]

      const d /* dirs */ = [
        { // d[0]
          path: "foo",
          children: () => [f[1]]
        }
      ]

      for (const g of [f, d])
        for (const x of g) x.children = x.children ? x.children() : []

      const routes = [...f, ...d]

      export { f as files, d as dirs, routes }
    `,
    tree: `
      import { files as f, dirs as d } from '/out/routes'

      const tree = {
        path: "",
        isRoot: true,
        children: [
          f[0],
          d[0]
        ]
      }

      export default tree
    `,
  },
  build => {
    build.add(['foo/bat.js', { isDirectory: nope }])
  },
  {
    routes: `
      const f /* files */ = [
        { // f[0]
          path: "baz",
          import: () => import("/pages/baz.js")
        },
        { // f[1]
          path: "foo/bar",
          import: () => import("/pages/foo/bar.js")
        },
        { // f[2]
          path: "foo/bat",
          import: () => import("/pages/foo/bat.js")
        }
      ]

      const d /* dirs */ = [
        { // d[0]
          path: "foo",
          children: () => [f[1], f[2]]
        }
      ]

      for (const g of [f, d])
        for (const x of g) x.children = x.children ? x.children() : []

      const routes = [...f, ...d]

      export { f as files, d as dirs, routes }
    `,
    tree: `
      import { files as f, dirs as d } from '/out/routes'

      const tree = {
        path: "",
        isRoot: true,
        children: [
          f[0],
          d[0]
        ]
      }

      export default tree
    `,
  },
])

test('does not stall on remove -> add', macro, {}, [
  async (build, files, t) => {
    build.add(['a.js', { isDirectory: nope }])
    build.start()
    await build.onIdle()
    build.remove(['a.js', { isDirectory: nope }])
    build.add(['b.js', { isDirectory: nope }])
    await build.onIdle()
    t.pass()
  },
])

test('virtual paths', macro, { parse: parseVirtual }, [
  build => {
    build.add(['a', { isDirectory: yup }])
    build.add(['a/b.c.d.js', { isDirectory: nope }])
    build.start()
  },
  {
    tree: `
      import { files as f, dirs as d } from '/out/routes'

      const tree = {
        path: "",
        isRoot: true,
        children: [
          d[0]
        ]
      }

      export default tree
    `,
    routes: `
      const f /* files */ = [
        { // f[0]
          path: "a/b/c/d",
          import: () => import("/pages/a/b.c.d.js")
        }
      ]

      const d /* dirs */ = [
        { // d[0]
          path: "a",
          children: () => [d[1]]
        },
        { // d[1]
          path: "a/b",
          children: () => [d[2]]
        },
        { // d[2]
          path: "a/b/c",
          children: () => [f[0]]
        }
      ]

      for (const g of [f, d])
        for (const x of g) x.children = x.children ? x.children() : []

      const routes = [...f, ...d]

      export { f as files, d as dirs, routes }
    `,
  },
  build => {
    build.remove(['a/b.c.d.js', { isDirectory: nope }])
    build.add(['a/b.d.js', { isDirectory: nope }])
  },
  {
    tree: `
      import { files as f, dirs as d } from '/out/routes'

      const tree = {
        path: "",
        isRoot: true,
        children: [
          d[0]
        ]
      }

      export default tree
    `,
    routes: `
      const f /* files */ = [
        { // f[0]
          path: "a/b/d",
          import: () => import("/pages/a/b.d.js")
        }
      ]

      const d /* dirs */ = [
        { // d[0]
          path: "a",
          children: () => [d[1]]
        },
        { // d[1]
          path: "a/b",
          children: () => [f[0]]
        }
      ]

      for (const g of [f, d])
        for (const x of g) x.children = x.children ? x.children() : []

      const routes = [...f, ...d]

      export { f as files, d as dirs, routes }
    `,
  },
])

{
  const expected0 = {
    routes: `
      const f /* files */ = [
        { // f[0]
          path: "a/b",
          import: () => import("/pages/a/b.js"),
          children: () => [f[1]]
        },
        { // f[1]
          path: "a/b/c",
          import: () => import("/pages/a.b.c.js")
        }
      ]

      const d /* dirs */ = [
        { // d[0]
          path: "a",
          children: () => [f[0]]
        }
      ]

      for (const g of [f, d])
        for (const x of g) x.children = x.children ? x.children() : []

      const routes = [...f, ...d]

      export { f as files, d as dirs, routes }
    `,
    tree: `
      import { files as f, dirs as d } from '/out/routes'

      const tree = {
        path: "",
        isRoot: true,
        children: [
          d[0]
        ]
      }

      export default tree
    `,
  }

  test('virtual path shadowing existing file', macro, { parse: parseVirtual }, [
    build => {
      build.add(['a', { isDirectory: yup }])
      build.add(['a/b.js', { isDirectory: nope }])
      build.add(['a.b.c.js', { isDirectory: nope }])
      build.start()
    },
    expected0,
    build => {
      build.update(['a.b.c.js', { isDirectory: nope }])
    },
    expected0,
    build => {
      build.update(['a/b.js', { isDirectory: nope }])
    },
    expected0,
    build => {
      build.remove(['a.b.c.js', { isDirectory: nope }])
    },
    {
      routes: `
        const f /* files */ = [
          { // f[0]
            path: "a/b",
            import: () => import("/pages/a/b.js")
          }
        ]

        const d /* dirs */ = [
          { // d[0]
            path: "a",
            children: () => [f[0]]
          }
        ]

        for (const g of [f, d])
          for (const x of g) x.children = x.children ? x.children() : []

        const routes = [...f, ...d]

        export { f as files, d as dirs, routes }
      `,
      tree: `
        import { files as f, dirs as d } from '/out/routes'

        const tree = {
          path: "",
          isRoot: true,
          children: [
            d[0]
          ]
        }

        export default tree
      `,
    },
  ])
}

test(
  'same file changes path on update',
  macro,
  () => {
    let i = 0
    return {
      parse: x => {
        if (x.isFile) {
          if (i++ === 0) {
            x.path = 'a/' + x.path
          } else {
            x.path = 'b/' + x.path
          }
        }
      },
    }
  },

  build => {
    build.add(['foo.js', { isDirectory: nope }])
    build.start()
  },
  {
    routes: `
      const f /* files */ = [
        { // f[0]
          path: "a/foo",
          import: () => import("/pages/foo.js")
        }
      ]

      const d /* dirs */ = [
        { // d[0]
          path: "a",
          children: () => [f[0]]
        }
      ]

      for (const g of [f, d])
        for (const x of g) x.children = x.children ? x.children() : []

      const routes = [...f, ...d]

      export { f as files, d as dirs, routes }
    `,
    tree: `
      import { files as f, dirs as d } from '/out/routes'

      const tree = {
        path: "",
        isRoot: true,
        children: [
          d[0]
        ]
      }

      export default tree
    `,
  },
  build => {
    build.update(['foo.js', { isDirectory: nope }])
  },
  {
    routes: `
      const f /* files */ = [
        { // f[0]
          path: "b/foo",
          import: () => import("/pages/foo.js")
        }
      ]

      const d /* dirs */ = [
        { // d[0]
          path: "b",
          children: () => [f[0]]
        }
      ]

      for (const g of [f, d])
        for (const x of g) x.children = x.children ? x.children() : []

      const routes = [...f, ...d]

      export { f as files, d as dirs, routes }
    `,
    tree: `
      import { files as f, dirs as d } from '/out/routes'

      const tree = {
        path: "",
        isRoot: true,
        children: [
          d[0]
        ]
      }

      export default tree
    `,
  }
)

const deeply_nested_dirs_expected = {
  routes: `
      const f /* files */ = [
        { // f[0]
          path: "a/b/c",
          import: () => import("/pages/a/b/c.js")
        },
        { // f[1]
          path: "d",
          import: () => import("/pages/d.js")
        }
      ]

      const d /* dirs */ = [
        { // d[0]
          path: "a",
          children: () => [d[1]]
        },
        { // d[1]
          path: "a/b",
          children: () => [f[0]]
        }
      ]

      for (const g of [f, d])
        for (const x of g) x.children = x.children ? x.children() : []

      const routes = [...f, ...d]

      export { f as files, d as dirs, routes }
    `,
  tree: `
      import { files as f, dirs as d } from '/out/routes'

      const tree = {
        path: "",
        isRoot: true,
        children: [
          d[0],
          f[1]
        ]
      }

      export default tree
    `,
}

test('deeply nested cached children are still listed in dirs', macro, {}, [
  build => {
    build.add(['a/b/c.js', { isDirectory: nope }])
    build.add(['d.js', { isDirectory: nope }])
    build.start()
  },
  deeply_nested_dirs_expected,
  build => {
    build.update(['d.js', { isDirectory: nope }])
  },
  deeply_nested_dirs_expected,
])

test(
  'bailing out of rebuild',
  macro,
  () => {
    let i = 0
    const parse = file => {
      if (i++ > 0) return false
      return file
    }
    return { parse }
  },
  [
    build => {
      build.add(['a.js', { isDirectory: nope }])
      build.start()
    },
    {
      routes: `
        const f /* files */ = [
          { // f[0]
            path: "a",
            import: () => import("/pages/a.js")
          }
        ]

        const d /* dirs */ = []

        for (const g of [f, d])
          for (const x of g) x.children = x.children ? x.children() : []

        const routes = [...f, ...d]

        export { f as files, d as dirs, routes }
      `,
      tree: `
        import { files as f, dirs as d } from '/out/routes'

        const tree = {
          path: "",
          isRoot: true,
          children: [
            f[0]
          ]
        }

        export default tree
      `,
    },
    (build, files, t) => {
      t._options.writeFile.hasBeenCalled(2)
      build.update(['a.js', { isDirectory: nope }])
    },
    (build, files, t) => {
      t._options.writeFile.hasBeenCalled(2)
    },
  ]
)

test(
  'item.rebuild === false',
  macro,
  () => {
    let i = 0
    const parse = file => {
      if (i++ > 0) file.rebuild = false
      return file
    }
    return { parse }
  },
  [
    build => {
      build.add(['a.js', { isDirectory: nope }])
      build.start()
    },
    {
      routes: `
        const f /* files */ = [
          { // f[0]
            path: "a",
            import: () => import("/pages/a.js")
          }
        ]

        const d /* dirs */ = []

        for (const g of [f, d])
          for (const x of g) x.children = x.children ? x.children() : []

        const routes = [...f, ...d]

        export { f as files, d as dirs, routes }
      `,
      tree: `
        import { files as f, dirs as d } from '/out/routes'

        const tree = {
          path: "",
          isRoot: true,
          children: [
            f[0]
          ]
        }

        export default tree
      `,
    },
    (build, files, t) => {
      t._options.writeFile.hasBeenCalled(2)
      build.update(['a.js', { isDirectory: nope }])
    },
    (build, files, t) => {
      t._options.writeFile.hasBeenCalled(2)
    },
  ]
)

test(
  'exclude from tree',
  macro,
  {
    parse: file => {
      if (file.path === 'a/c') {
        file.tree = false
      }
    },
  },
  [
    build => {
      build.add(['a', { isDirectory: yup }])
      build.add(['a/b.js', { isDirectory: nope }])
      build.add(['a/c.js', { isDirectory: nope }])
      build.start()
    },
    {
      routes: `
      const f /* files */ = [
        { // f[0]
          path: "a/b",
          import: () => import("/pages/a/b.js")
        },
        { // f[1]
          path: "a/c",
          import: () => import("/pages/a/c.js")
        }
      ]

      const d /* dirs */ = [
        { // d[0]
          path: "a",
          children: () => [f[0]]
        }
      ]

      for (const g of [f, d])
        for (const x of g) x.children = x.children ? x.children() : []

      const routes = [...f, ...d]

      export { f as files, d as dirs, routes }
    `,
    },
  ]
)

test(
  'merged',
  macro,
  {
    merged: true,
  },
  [
    build => {
      build.add(['a.js', { isDirectory: nope }])
      build.add(['foo/b.js', { isDirectory: nope }])
      build.start()
    },
    {
      routes: `
        const f /* files */ = [
          { // f[0]
            path: "a",
            import: () => import("/pages/a.js")
          },
          { // f[1]
            path: "foo/b",
            import: () => import("/pages/foo/b.js")
          }
        ]

        const d /* dirs */ = [
          { // d[0]
            path: "foo",
            children: () => [f[1]]
          }
        ]

        for (const g of [f, d])
          for (const x of g) x.children = x.children ? x.children() : []

        const routes = [...f, ...d]

        const tree = {
          path: "",
          isRoot: true,
          children: [
            f[0],
            d[0]
          ]
        }

        export { f as files, d as dirs, routes, tree }
      `,
    },
  ]
)

test(
  'extras',
  macro,
  t => {
    t._i = 0
    const parse = file => {
      file.rebuildExtras = t._rebuildExtras
      file.rebuild = false
      file.extra = { i: t._i }
    }
    return { write: { extras: true }, parse }
  },
  build => {
    build.add(['a.js', { isDirectory: nope }])
    build.start()
  },
  {
    extras: `
      const extras = {
        "a": {
          "i": 0
        }
      }

      export default extras
    `,
  },
  (build, files, t) => {
    t._options.writeFile.hasBeenCalled(3)
    t._i = 1
    build.update(['a.js', { isDirectory: nope }])
  },
  {
    extras: `
      const extras = {
        "a": {
          "i": 1
        }
      }

      export default extras
    `,
  },
  (build, files, t) => {
    t._options.writeFile.hasBeenCalled(4)
    build.update(['a.js', { isDirectory: nope }])
  },
  {
    extras: `
      const extras = {
        "a": {
          "i": 1
        }
      }

      export default extras
    `,
  },
  (build, files, t) => {
    t._options.writeFile.hasBeenCalled(4)
    t._i = 2
    build.update(['a.js', { isDirectory: nope }])
  },
  {
    extras: `
      const extras = {
        "a": {
          "i": 2
        }
      }

      export default extras
    `,
  },
  (build, files, t) => {
    t._options.writeFile.hasBeenCalled(5)
    t._i = 3
    t._rebuildExtras = false
    build.update(['a.js', { isDirectory: nope }])
  },
  {
    extras: `
      const extras = {
        "a": {
          "i": 2
        }
      }

      export default extras
    `,
  },
  (build, files, t) => {
    t._options.writeFile.hasBeenCalled(5)
    build.remove(['a.js', { isDirectory: nope }])
  },
  {
    extras: `
      const extras = {}

      export default extras
    `,
  }
)

test('no target files', macro, { write: { extras: true } }, [
  build => {
    build.start()
  },
  {
    routes: `
      const f /* files */ = []

      const d /* dirs */ = []

      for (const g of [f, d])
        for (const x of g) x.children = x.children ? x.children() : []

      const routes = [...f, ...d]

      export { f as files, d as dirs, routes }
    `,
    tree: `
      import { files as f, dirs as d } from '/out/routes'

      const tree = {
        path: "",
        isRoot: true,
        children: []
      }

      export default tree
    `,
    extras: `
      const extras = {}

      export default extras
    `,
  },
])

test(
  'conflict resolution: change existing',
  macro,
  {
    parse: x => {
      if (x.isFile) x.path = 'foo/a'
    },
    resolveConflict(file, existing) {
      existing.path = existing.path.replace(/a$/, 'a1')
      return true
    },
  },
  [
    build => {
      build.add(['foo/a1.js', { isDirectory: nope }])
      build.start()
    },
    build => {
      build.add(['foo/a2.js', { isDirectory: nope }])
    },
    {
      routes: `
        const f /* files */ = [
          { // f[0]
            path: "foo/a",
            import: () => import("/pages/foo/a2.js")
          },
          { // f[1]
            path: "foo/a1",
            import: () => import("/pages/foo/a1.js")
          }
        ]

        const d /* dirs */ = [
          { // d[0]
            path: "foo",
            children: () => [f[0], f[1]]
          }
        ]

        for (const g of [f, d])
          for (const x of g) x.children = x.children ? x.children() : []

        const routes = [...f, ...d]

        export { f as files, d as dirs, routes }
      `,
      tree: `
        import { files as f, dirs as d } from '/out/routes'

        const tree = {
          path: "",
          isRoot: true,
          children: [
            d[0]
          ]
        }

        export default tree
      `,
    },
  ]
)

test(
  'conflict resolution: change new file',
  macro,
  {
    parse: x => {
      if (x.isFile) x.path = 'foo/a'
    },
    resolveConflict(file) {
      if (file.relative.includes('index')) {
        file.path = 'foo/a/index'
      }
      return true
    },
  },
  [
    build => {
      build.add(['foo/a.js', { isDirectory: nope }])
      build.add(['foo/a.index.js', { isDirectory: nope }])
      build.start()
    },
    {
      routes: `
        const f /* files */ = [
          { // f[0]
            path: "foo/a",
            import: () => import("/pages/foo/a.js"),
            children: () => [f[1]]
          },
          { // f[1]
            path: "foo/a/index",
            import: () => import("/pages/foo/a.index.js")
          }
        ]

        const d /* dirs */ = [
          { // d[0]
            path: "foo",
            children: () => [f[0]]
          }
        ]

        for (const g of [f, d])
          for (const x of g) x.children = x.children ? x.children() : []

        const routes = [...f, ...d]

        export { f as files, d as dirs, routes }
      `,
      tree: `
        import { files as f, dirs as d } from '/out/routes'

        const tree = {
          path: "",
          isRoot: true,
          children: [
            d[0]
          ]
        }

        export default tree
      `,
    },
    build => {
      build.remove(['foo/a.index.js', { isDirectory: nope }])
      build.add(['foo/a.index.jsx', { isDirectory: nope }])
    },
    {
      routes: `
        const f /* files */ = [
          { // f[0]
            path: "foo/a",
            import: () => import("/pages/foo/a.js"),
            children: () => [f[1]]
          },
          { // f[1]
            path: "foo/a/index",
            import: () => import("/pages/foo/a.index.jsx")
          }
        ]

        const d /* dirs */ = [
          { // d[0]
            path: "foo",
            children: () => [f[0]]
          }
        ]

        for (const g of [f, d])
          for (const x of g) x.children = x.children ? x.children() : []

        const routes = [...f, ...d]

        export { f as files, d as dirs, routes }
      `,
      tree: `
        import { files as f, dirs as d } from '/out/routes'

        const tree = {
          path: "",
          isRoot: true,
          children: [
            d[0]
          ]
        }

        export default tree
      `,
    },
  ]
)
