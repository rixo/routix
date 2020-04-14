import CheapWatch from 'cheap-watch'

import { pipe, map } from '@/util/fp'

export default ({ log, dir, extensions, watch = false }, build) => {
  const isWatchedFile = path => extensions.some(x => path.endsWith(x))

  const filter = ({ path, stats }) => stats.isDirectory() || isWatchedFile(path)

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
      .then(pipe(() => watcher.paths, map(build.add)))
      .then(build.start))

  const close = () => watcher.close()

  return { init, close, isWatchedFile }
}
