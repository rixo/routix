# Routix

> Performance oriented and easily customizable routes generator.

- FS is hit only once for listing and stats by the watcher
- the tree is fully constructed from user provided `path`
- all processing is done at compile time
- the flat routes list and the tree references the same runtime objects

Routix watches some directory for files with some given extensions, and outputs a flat list of routes (files) and/or a nested tree.

The file watcher already has to list and stats from the file system; Routix doesn't hit the file system beyond that. During watch, most things are kept in memory, and only the relevant bits are recomputed.

The output is very basic and can easily be customized by providing a `parse` function that receives a file and can change its `path` or augment it with custom properties, and a `format` function that converts the intermediary file objects to the format that will be written into the generated files.

Only files (not directories) are taken into account. The tree hierarchy is fully constructed from the file objects' `path` property that is returned by the `parse` function.
