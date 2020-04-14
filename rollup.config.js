import resolve from '@rollup/plugin-node-resolve'
import builtins from 'builtin-modules'

export default {
  input: ['./src/rollup.js', './src/routix.js'],
  output: {
    format: 'cjs',
    dir: '.',
    chunkFileNames: 'dist/[name].js',
    sourcemap: true,
  },
  external: builtins,
  plugins: [
    resolve({
      preferBuiltins: true,
    }),
  ],
}
