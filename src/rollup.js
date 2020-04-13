import reader from '@/read'
import builder from '@/build'
import { pipe } from '@/util'
import { parseOptions } from '@/options'

let read

const noWriteWarning =
  'Both routes and tree generation are disabled, routix will do nothing'

const createPlugin = options => {
  const { watchDelay, write } = options

  const build = builder(options)

  if (read) {
    // eslint-disable-next-line no-console
    console.info('[routix] Closing previous watchers')
    read.close()
  }

  read = reader(
    {
      watch: !!process.env.ROLLUP_WATCH,
      ...options,
    },
    build
  )

  const readyPromise = read.init()

  return {
    name: 'routix',

    // prevent the build from running, until routes.js is completely generated
    //
    // FIXME Nollup 0.9.0 does not implement buildStart correctly (but
    //       renderStart kicks in too late to prevent Rollup from using an
    //       already existing routes.js...)
    //
    // NOTE watchDelay option
    //
    // this is intented to prevent a nasty race with
    // rollup-plugin-hot/autoccreate
    //
    // autocreate plugin is needed for HMR stability because Rollup crashes
    // and can't recover when it tries to import a missing file. autocreate
    // mitigates this by creating empty missing files; thus allowing Rollup
    // to keep humming
    //
    // the race however goes like this:
    //
    // - user rename/delete page file
    // - rollup picks file change
    // - rollup triggers build
    // - rollup-plugin-hot/autocreate sees deleted file in routes.js
    // - autocreate recreates just deleted file <--- HERE BE BUG
    // - routix picks file change
    // - routix recreates routes.js
    // - ... but too late, user has extraneous deleted file recreated
    // - rollup picks the change in routes.js...
    //
    // this delay is intented to give some time to routix to pick the
    // change first (and so rollup plugin will block start of rollup build
    // until routes.js has been generated)
    //
    // we can't be too greedy, because this delay will be paid for _any_
    // file change when user is working, even when unneeded (and in this
    // case the delay will be consumed in full -- nominal case is worst
    // case) :-/
    //
    // 20ms seems to work on my machine
    //
    async buildStart() {
      try {
        if (!write.routes && !write.tree) {
          this.warn(noWriteWarning)
          return
        }

        // catch & report start errors
        await readyPromise

        // prevent build from starting until Routix has finished generating
        // routes.js (or Rollup would do a useless build with stalled routes.js)
        await build.onIdle(watchDelay)
      } catch (err) {
        this.error(err)
      }
    },
  }
}

export default pipe(parseOptions, createPlugin)
