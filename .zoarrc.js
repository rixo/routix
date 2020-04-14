module.exports = {
  // pattern(s) to find test files
  files: '**/*.spec.js',

  // patterns of files to watch
  watch: ['src/**/*', 'test/**/*'],

  // patterns to always ignore when searching for files or watching
  ignore: ['**/node_modules', '**/.git'],

  // default pipes (--pipe argument overrides those, --no-pipes to disable)
  // 'pipe.run': '',
  // 'pipe.ls': '',
  // 'pipe.print': '',
}
