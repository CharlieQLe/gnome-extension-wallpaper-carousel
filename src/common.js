'use strict';

const { Gio, GLib } = imports.gi;
const ByteArray = imports.byteArray;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { parseXML } = Me.imports.xmlParser;

var Settings = class Settings {
    constructor(schema) {
        this._schema = schema;
    }

    get schema() { 
        return this._schema;
    }

    onChanged(key, func) { 
        this._schema.connect(`changed::${key}`, func); 
    }

    getInt(key) { 
        return this._schema.get_int(key); 
    }

    setInt(key, value) { 
        this._schema.set_int(key, value); 
    }

    getString(key) { 
        return this._schema.get_string(key); 
    }

    setString(key, value) { 
        this._schema.set_string(key, value); 
    }

    getStrv(key) {
        return this._schema.get_strv(key);
    }

    setStrv(key, value) {
        this._schema.set_strv(key, value);
    }
}

var WallpaperCarouselSettings = class WallpaperCarouselSettings extends Settings {
    static TIMER = 'timer';
    static ORDER = 'order';

    static getNewSchema() {
        const extensionUtils = imports.misc.extensionUtils;
        return extensionUtils.getSettings(extensionUtils.getCurrentExtension().metadata['settings-schema']);
    }

    constructor() { 
        super(WallpaperCarouselSettings.getNewSchema()); 
    }

    get timer() {
        return this.getInt(WallpaperCarouselSettings.TIMER);
    }

    onChangedTimer(func) {
        this.onChanged(WallpaperCarouselSettings.TIMER, func);
    }

    get order() {
        return this.getStrv(WallpaperCarouselSettings.ORDER);
    }

    set order(order) {
        this.setStrv(WallpaperCarouselSettings.ORDER, order);
    }

    onChangedOrder(func) {
        this.onChanged(WallpaperCarouselSettings.ORDER, func);
    }
}

var BackgroundSettings = class BackgroundSettings extends Settings {
    static PICTURE_URI = 'picture-uri';
    static PICTURE_URI_DARK = 'picture-uri-dark';

    static getNewSchema() {
        return new Gio.Settings({ schema: 'org.gnome.desktop.background' });
    }

    constructor() {
        super(BackgroundSettings.getNewSchema());
    }

    get pictureUri() {
        return this.getString(BackgroundSettings.PICTURE_URI);
    }

    set pictureUri(path) {
        return this.setString(BackgroundSettings.PICTURE_URI, path);
    }

    get pictureUriDark() {
        return this.getString(BackgroundSettings.PICTURE_URI_DARK);
    }

    set pictureUriDark(path) {
        return this.setString(BackgroundSettings.PICTURE_URI_DARK, path);
    }
}

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