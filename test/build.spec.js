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

      f.dirs = d

      export default f
    `,
    tree: `
      import f from '/out/routes'

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

      export default f
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

      export default {
        path: "",
        isRoot: true,
        children: [
          f[0],
          d[0]
        ]
      }
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

      f.dirs = d

      export default f
    `,
    tree: `
      import f from '/out/routes'

      const d = f.dirs

      export default {
        path: "",
        isRoot: true,
        children: [
          f[1]
        ]
      }
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
      import f from '/out/routes'

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
        { // f[0]
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
      import f from '/out/routes'

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

      f.dirs = d

      export default f
    `,
    tree: `
      import f from '/out/routes'

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

      f.dirs = d

      export default f
    `,
    tree: `
      import f from '/out/routes'

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

      f.dirs = d

      export default f
    `,
    tree: `
      import f from '/out/routes'

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
      import f from '/out/routes'

      const d = f.dirs

      export default {
        path: "",
        isRoot: true,
        children: [
          d[0]
        ]
      }
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
      import f from '/out/routes'

      const d = f.dirs

      export default {
        path: "",
        isRoot: true,
        children: [
          d[0]
        ]
      }
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

      f.dirs = d

      export default f
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

        f.dirs = d

        export default f
      `,
    tree: `
        import f from '/out/routes'

        const d = f.dirs

        export default {
          path: "",
          isRoot: true,
          children: [
            d[0]
          ]
        }
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

        f.dirs = d

        export default f
      `,
      tree: `
        import f from '/out/routes'

        const d = f.dirs

        export default {
          path: "",
          isRoot: true,
          children: [
            d[0]
          ]
        }
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

        f.dirs = d

        export default f
      `,
    tree: `
        import f from '/out/routes'

        const d = f.dirs

        export default {
          path: "",
          isRoot: true,
          children: [
            d[0]
          ]
        }
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

        f.dirs = d

        export default f
      `,
    tree: `
        import f from '/out/routes'

        const d = f.dirs

        export default {
          path: "",
          isRoot: true,
          children: [
            d[0]
          ]
        }
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

      f.dirs = d

      export default f
    `,
  tree: `
      import f from '/out/routes'

      const d = f.dirs

      export default {
        path: "",
        isRoot: true,
        children: [
          d[0],
          f[1]
        ]
      }
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

      f.dirs = d

      export default f
    `,
      tree: `
      import f from '/out/routes'

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

      f.dirs = d

      export default f
    `,
    },
  ]
)
