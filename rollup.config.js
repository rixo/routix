import resolve from '@rollup/plugin-node-resolve'
import builtins from 'builtin-modules'

export default {
  input: './src/rollup.js',
  output: {
    format: 'cjs',
    file: './rollup.js',
  },
  external: builtins,
  plugins: [
    resolve({
      preferBuiltins: true,
    }),
  ],
}
