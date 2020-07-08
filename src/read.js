import CheapWatch from 'cheap-watch'

import { map } from '@/util/fp'

export default ({ log, dir, extensions, watch = false, ignore }, build) => {
  const isWatchedFile = path => extensions.some(x => path.endsWith(x))

  const filter = ({ path, stats }) =>
    (stats.isDirectory() || isWatchedFile(path)) && !(ignore && ignore(path))

  const watcher = new CheapWatch({ dir, watch, filter })

  log.info(
    `${watch ? 'Watching' : 'Reading'} ${dir}/**/*.(${extensions
      .map(x => x.slice(1))
      .join('|')})`
  )

  if (watch) {
    watcher.on('+', ({ path, stats, isNew }) => {
      if (isNew) {
        build.add([path, stats])
      } else {
        build.update([path, stats])
      }
    })

    watcher.on('-', ({ path, stats }) => build.remove([path, stats]))
  }

  let initPromise

  const init = () =>
    initPromise ||
    (initPromise = watcher
      .init()
      .then(() => map(build.add, watcher.paths))
      .then(build.start))

  const close = async () => {
    await initPromise
    watcher.close()
  }

  return { init, close, isWatchedFile }
}
