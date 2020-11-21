import reader from '@/read'
import builder from '@/build'
import { pipe } from '@/util'
import { parseOptions } from '@/options'

let globalRead

const noWriteWarning =
  'Both routes and tree generation are disabled, routix will do nothing'

export default function snowpack_plugin_routix(
  snowpackConfig,
  pluginOptions = {}
) {
  const options = parseOptions(pluginOptions)
  const { watchDelay, write, watch, log } = options

  if (globalRead) {
    log.info('[routix] Closing previous watchers')
    globalRead.close()
  }

  const build = builder(options)

  const read = reader(
    {
      ...options,
      // NOTE CheapWatch bails out if watch is not a bool
      watch: Boolean(watch),
      // watch: watch != null ? watch : !!process.env.ROLLUP_WATCH,
    },
    build
  )

  // don't share instance when running in test
  if (process.env.NODE_ENV !== 'test') {
    globalRead = read
  }

  const readyPromise = read.init()

  const writeTargets = Object.values(write).filter(Boolean)

  const isWriteTarget = id => writeTargets.some(x => x === id)

  return {
    name: 'snowpack-plugin-routix',

    resolve: {
      // input: resolveInputOption || ['.svelte'],
      input: ['.js', '.svelte'],
      output: ['.js', '.svelte'],
    },

    knownEntrypoints: [],

    // config(config) {
    //   console.log(config.mount, options.write.routes)
    //   process.exit()
    //   this.markChanged(options.write.routes)
    //   this.markChanged('')
    // },

    async load({ filePath, isHmrEnabled, isSSR }) {
      console.log('>>', filePath)
    },
  }
}
