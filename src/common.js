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

var WallpaperData = class WallpaperData {
    constructor(name, light, dark) {
        this.name = name;
        this.light = light;
        this.dark = dark;
    }
}

/**
 * Get all wallpapers.
 * 
 * @returns {Array<WallpaperData>} Wallpapers
 */
function getAllWallpapers() {
    const wallpapers = [];

    // Handle XMLs
    [   GLib.build_filenamev([GLib.get_user_data_dir(), 'gnome-background-properties']),
        ...GLib.get_system_data_dirs().map(path => GLib.build_filenamev([path, 'gnome-background-properties']))
    ].forEach(directory => forEachFile(directory, file => {
        const path = file.get_path();
        if (!path.endsWith('.xml')) return;
        const contents = GLib.file_get_contents(path);
        if (!contents[0]) return;
        let xmlText = contents[1];
        if (xmlText instanceof Uint8Array) xmlText = ByteArray.toString(xmlText);
        const parsedXml = parseXML(xmlText);

        // Get wallpaper data
        let name = file.get_basename();
        let light = '';
        let dark = '';
        parsedXml.f.forEach(wallpapersData => {
            if (wallpapersData.n.toLowerCase() !== 'wallpapers') return;
            const wallpaperData = wallpapersData.f[0];
            if (wallpaperData.n.toLowerCase() !== 'wallpaper') return;
            wallpaperData.f.forEach(x => {
                const n = x.n.toLowerCase();
                if (n === 'filename') {
                    light = x.f[0].trim();
                } else if (n === 'filename-dark') {
                    dark = x.f[0].trim();
                } else if (n === 'name') {
                    name = x.f[0].trim();
                }
            });
        });
        const lightEmpty = light === '';
        const darkEmpty = dark === '';
        if (lightEmpty && darkEmpty) return;
        else if (lightEmpty) light = dark;
        else if (darkEmpty) dark = light;
        if (Gio.File.new_for_path(light).query_file_type(Gio.FileQueryInfoFlags.NONE, null) !== Gio.FileType.REGULAR ||
            Gio.File.new_for_path(dark).query_file_type(Gio.FileQueryInfoFlags.NONE, null) !== Gio.FileType.REGULAR) return; 
        wallpapers.push(new WallpaperData(name, light, dark));
    }));

    // Handle manually added images
    forEachFile(GLib.build_filenamev([GLib.get_user_data_dir(), 'backgrounds']), file => {
        const path = file.get_path();
        const pathLower = path.toLowerCase();
        if (!pathLower.endsWith('.jpg') && !pathLower.endsWith('.jpeg') && !pathLower.endsWith('.png') && !pathLower.endsWith('.webp')) return;
        wallpapers.push(new WallpaperData(file.get_basename(), path, path));
    });

    return wallpapers.sort((a, b) => (a.name < b.name) ? -1 : (a.name > b.name ? 1 : 0));
}

/**
 * Get the active wallpapers from a list of wallpapers based on a list of names.
 * 
 * @param {Array<WallpaperData>} wallpapers 
 * @param {Array<string>} activeWallpaperNames 
 * @returns {Array<WallpaperData>} Active wallpapers
 */
function getActiveWallpapers(wallpapers, activeWallpaperNames) {
    return wallpapers.filter(data => activeWallpaperNames.includes(data.name));
}

/**
 * Sort wallpapers by their names.
 * 
 * @param {Array<WallpaperData>} wallpapers 
 */
function sortWallpapers(wallpapers) {
    wallpapers.sort((a, b) => (a.name < b.name) ? -1 : (a.name > b.name ? 1 : 0));
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