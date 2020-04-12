export const pipe = (...fns) => x0 => fns.reduce((x, f) => f(x), x0)

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Escaping
export const escapeRe = string =>
  string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&')

export const noop = () => {}

export const split = (predicate, items) => {
  const yes = []
  const no = []
  for (const item of items) {
    const target = predicate(item) ? yes : no
    target.push(item)
  }
  return [yes, no]
}
