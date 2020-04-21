const _extras = extras => 'const extras = ' + JSON.stringify(extras, false, 2)

export default options => {
  const extras = {}

  const getId = options.id ? file => file.id : file => file.path

  const add = file => {
    extras[getId(file)] = file.extra
  }

  const update = add

  const remove = file => {
    delete extras[getId(file)]
  }

  const generate = () => _extras(extras)

  return {
    add,
    update,
    remove,

    generate,
  }
}
