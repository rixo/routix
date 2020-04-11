import CheapWatch from 'cheap-watch'

import { pipe, map } from '@/util/fp'

export default ({ dir, extensions, watch = false }, build) => {
  const filter = ({ path, stats }) =>
    stats.isDirectory() || extensions.some(x => path.endsWith(x))

  const watcher = new CheapWatch({ dir, watch, filter })

  watcher
    .init()
    .then(pipe(() => watcher.paths, map(build.add)))
    .catch(err => {
      // eslint-disable-next-line no-console
      console.error(err)
    })

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
}
