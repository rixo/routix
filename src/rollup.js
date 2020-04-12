import reader from '@/read'
import builder from '@/build'
import { pipe } from '@/util'
import { parseOptions } from '@/options'

const wait = delay => new Promise(resolve => setTimeout(resolve, delay))

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

  const readyPromise = read.init().catch(err => {
    // eslint-disable-next-line no-console
    console.error('[routix] Failed to start', err)
  })

  return {
    name: 'routix',

    // prevent the build from running, until routes.js is completely generated
    //
    // FIXME Nollup 0.9.0 does not implement buildStart correctly (but
    //       renderStart kicks in too late to prevent Rollup from using an
    //       already existing routes.js...)
    //
    async buildStart() {
      try {
        if (!write.routes && !write.tree) {
          this.warn(noWriteWarning)
          return
        }

        // catch & report start errors
        await readyPromise

        // watchDelay option
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
        if (watchDelay) {
          // we stop waiting early if Routix has caught the change (waitChange)
          // -- this ensures optimal waiting time but, unfortunately, in the
          // marginal case of when user deletes/renames a Routix page file;
          // we're stil degenerate (i.e. wait full delay) for any other source
          // watched by Rollup...
          await Promise.race([wait(watchDelay), build.onChange()])
        }

        // prevent build from starting until Routix has finished generating
        // routes.js (or Rollup would do a useless build with stalled routes.js)
        await build.onIdle()
      } catch (err) {
        this.error(err)
      }
    },
  }
}

export default pipe(parseOptions, createPlugin)
