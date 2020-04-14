import reader from '@/read'
import builder from '@/build'
import { pipe } from '@/util'
import { parseOptions } from '@/options'

const createRoutix = options => {
  const { write } = options

  const build = builder(options)

  const read = reader(options, build)

  const writeTargets = Object.values(write).filter(Boolean)

  const isWriteTarget = id => writeTargets.some(x => x === id)

  const { onIdle } = build
  const { init, isWatchedFile, close } = read

  return {
    start: init,
    onIdle,
    isWriteTarget,
    isWatchedFile,
    close,
  }
}

export default pipe(parseOptions, createRoutix)
