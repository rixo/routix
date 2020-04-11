import * as path from 'path'
import read from '@/read'
import Builder from '@/build'

const options = {
  dir: path.resolve(__dirname, '../../svench.routix/example/src'),
  extensions: ['.svench', '.svench.svx', '.svench.svelte'],
  // output: path.resolve(__dirname, '../routes.js'),
  write: {
    routes: path.resolve(__dirname, '../routes.js'),
    tree: path.resolve(__dirname, '../tree.js'),
  },
}

const builder = Builder(options)

read(options, builder)
