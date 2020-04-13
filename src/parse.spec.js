import { test, describe } from 'zorax'

import parser from './parse.js'

describe('parse factory', () => {
  test('is a function', t => {
    t.eq(typeof parser, 'function')
  })

  test('returns a function', t => {
    const parse = parser({ extensions: ['.svench', '.svench.svelte'] })
    t.eq(typeof parse, 'function')
  })
})

// TODO migrate userland tests to svench.routix

describe('parse', () => {
  const macro = (t, relative, dir, expected) => {
    const parse = parser({
      dir: '/app',
      extensions: ['.svench', '.svench.svelte'],
    })

    const result = parse([relative, { isDirectory: () => dir }])

    for (const [key, value] of Object.entries(expected)) {
      t.eq(result[key], value, key)
    }
  }

  macro.title = (title, relative, dir) => title || relative + (dir ? '/' : '')

  describe('drop file extension', () => {
    test(macro, 'foo.svench', false, {
      absolute: '/app/foo.svench',
      path: 'foo',
      // sortKey: 'foo',
      // segment: 'foo',
      // title: 'foo',
    })

    test(macro, 'foo.svench.svelte', false, {
      absolute: '/app/foo.svench.svelte',
      path: 'foo',
      // sortKey: 'foo',
      // segment: 'foo',
      // title: 'foo',
    })
  })

  describe('does not drop unknown file extensions', () => {
    test(macro, 'foo.svenchy', false, {
      absolute: '/app/foo.svenchy',
      path: 'foo',
      // sortKey: 'foo',
      // segment: 'foo',
      // title: 'foo',
    })
  })

  // describe('sort prefix', () => {
  //   test(macro, '01-foo.svench', false, {
  //     absolute: '/app/01-foo.svench',
  //     path: 'foo',
  //     sortKey: '01-foo',
  //     segment: 'foo',
  //     title: 'foo',
  //   })
  //
  //   test(macro, '02-foo/01-bar.svench', false, {
  //     absolute: '/app/02-foo/01-bar.svench',
  //     path: 'foo/bar',
  //     sortKey: '01-bar',
  //     segment: 'bar',
  //     title: 'bar',
  //   })
  //
  //   test(macro, '000.svench', false, {
  //     absolute: '/app/000.svench',
  //     path: '000',
  //     sortKey: '000',
  //     segment: '000',
  //     title: '000',
  //   })
  //
  //   test(macro, '000', true, {
  //     absolute: '/app/000',
  //     path: '000',
  //     sortKey: '000',
  //     segment: '000',
  //     title: '000',
  //   })
  //
  //   test(macro, '000/99-aaa.svench', true, {
  //     absolute: '/app/000/99-aaa.svench',
  //     path: '000/aaa',
  //     sortKey: '99-aaa',
  //     segment: 'aaa',
  //     title: 'aaa',
  //   })
  // })

  // describe('. => /', () => {
  //   test(macro, '02-foo/01-bar.00-baz.svench', false, {
  //     absolute: '/app/02-foo/01-bar.00-baz.svench',
  //     path: 'foo/bar/baz',
  //     sortKey: '00-baz',
  //     segment: 'baz',
  //     title: 'baz',
  //   })
  // })
})
