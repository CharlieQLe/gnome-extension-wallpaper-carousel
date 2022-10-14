'use strict';

const { Gio, GLib } = imports.gi;

/**
 * Convert a path to a file to a file uri.
 * 
 * @param {string} path 
 * @returns {string} file uri
 */
function convertPathToURI(path) {
    return `file://${encodeURI(path)}`;
}

/**
 * Iterate over every file in a directory and run a function for each file.
 * 
 * @param {string} directoryPath 
 * @param {Func<Gio.File>} func
 */
function forEachFile(directoryPath, func) {
    const directory = Gio.File.new_for_path(directoryPath);
    if (directory.query_file_type(Gio.FileQueryInfoFlags.NONE, null) !== Gio.FileType.DIRECTORY) return;
    const enumerator = directory.enumerate_children('standard::', Gio.FileQueryInfoFlags.NONE, null);
    while (true) {
        const info = enumerator.next_file(null);
        if (info === null) break;
        const file = enumerator.get_child(info);
        if (file === null) continue;
        func(file);
    }
}