import reader from '@/read'
import builder from '@/build'
import { pipe } from '@/util'
import { parseOptions } from '@/options'

const createRoutix = options => {
  const { log, write, start } = options

  const build = builder(options)

  const read = reader(options, build)

  const writeTargets = Object.values(write).filter(Boolean)

  const isWriteTarget = id => writeTargets.some(x => x === id)

  const { onIdle } = build
  const { init, isWatchedFile, close } = read

  if (start) {
    setTimeout(() => {
      read.init().catch(err => log.error(err))
    })
  }

  return {
    start: init,
    onIdle,
    isWriteTarget,
    isWatchedFile,
    close,
  }
}

export default pipe(parseOptions, createRoutix)
