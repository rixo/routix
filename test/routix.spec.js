import * as path from 'path'
import { Volume } from 'memfs'
import rewiremock from 'rewiremock'
import { test, buildMacro } from '.'

const macro = buildMacro(options => {
  const fs = new Volume()

  fs.stat = fs.stat.bind(fs)
  fs.readdir = fs.readdir.bind(fs)
  fs.watch = fs.watch.bind(fs)

  const { default: Routix } = rewiremock.proxy('../src/routix', { fs })

  const routix = Routix({ watch: false, ...options, fs })

  fs.mkdirSync(options.dir, { recursive: true })

  routix._add = (x, contents = '') => {
    const file = path.join(options.dir, x)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, contents, 'utf8')
  }

  return routix
})

test('basic', macro, {}, [
  build => {
    build._add('a.js')
    build._add('foo/b.js')
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

test('importProp', macro, { importProp: 'component' }, [
  build => {
    build._add('a.js')
    build.start()
  },
  {
    routes: `
      const f /* files */ = [
        { // f[0]
          path: "a",
          component: () => import("/pages/a.js")
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
])

test('importDefault', macro, { importDefault: true }, [
  build => {
    build._add('a.js')
    build.start()
  },
  {
    routes: `
      const dft = m => m.default

      const f /* files */ = [
        { // f[0]
          path: "a",
          import: () => import("/pages/a.js").then(dft)
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
])

// SKIP: watch mock does not work
test.skip('watch', macro, { watch: true }, [
  build => {
    build._add('a.js')
    build._add('foo/b.js')
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
  build => {
    build._add('foo/c.js')
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
        },
        { // f[1]
          path: "foo/c",
          import: () => import("/pages/foo/c.js")
        },
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
  build => {
    build.close()
  },
])
