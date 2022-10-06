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

    getBoolean(key) { 
        return this._schema.get_boolean(key); 
    }

    setBoolean(key, value) { 
        this._schema.set_boolean(key, value); 
    }
}

var WallpaperManager = class WallpaperManager {
    static _wallpaperData;
    
    static initialize() {
        this._wallpaperData = [];
        
        getXMLs().forEach(path => {
            const data = this.findWallpaperData(processXMLFromPath(path));
            if (data !== null) this._wallpaperData.push(data);
        });
    }

    static destroy() {
        this._wallpaperData = null;
    }
    
    static get initialized() {
        return this._wallpaperData !== null;
    }

    static get wallpaperData() {
        return this._wallpaperData;
    }

    static findWallpaperData(xml) {
        const data = {
            default: '',
            dark: ''
        };
        xml.f.forEach(wallpapersData => {
            if (wallpapersData.n.toLowerCase() !== 'wallpapers') return;
            const wallpaperData = wallpapersData.f[0];
            if (wallpaperData.n.toLowerCase() !== 'wallpaper') return;
            wallpaperData.f.forEach(x => {
                const n = x.n.toLowerCase();
                if (n === 'filename') {
                    data.default = x.f[0].trim();
                } else if (n === 'filename-dark') {
                    data.dark = x.f[0].trim();
                }
            });
        });
    
        const defaultEmpty = data.default === '';
        const darkEmpty = data.dark === '';
    
        if (defaultEmpty && darkEmpty) return null;
        else if (defaultEmpty) data.default = data.dark;
        else if (darkEmpty) data.dark = data.default;
    
        const defaultData = Gio.File.new_for_path(data.default);   
        if (defaultData.query_file_type(Gio.FileQueryInfoFlags.NONE, null) !== Gio.FileType.REGULAR) return null; 
    
        const darkData = Gio.File.new_for_path(data.dark);   
        if (darkData.query_file_type(Gio.FileQueryInfoFlags.NONE, null) !== Gio.FileType.REGULAR) return null; 
    
        return data;
    }
}

function _addXMLPath(paths, path) {
    const directory = Gio.File.new_for_path(path);
    if (directory.query_file_type(Gio.FileQueryInfoFlags.NONE, null) !== Gio.FileType.DIRECTORY) return paths;
    const enumerator = directory.enumerate_children('standard::', Gio.FileQueryInfoFlags.NONE, null);
    while (true) {
        const info = enumerator.next_file(null);
        if (info === null) break;
        const xml = enumerator.get_child(info);
        if (xml === null) continue;
        const x = xml.get_path();
        if (x.endsWith('.xml')) paths.add(x);
    }
    return paths;
}

function convertPathToURI(path) {
    return `file://${path.replace(' ', '%20')}`;
}

function getXMLs() {
    return [
        GLib.build_filenamev([GLib.get_user_data_dir(), 'gnome-background-properties']),
        ...GLib.get_system_data_dirs().map(path => GLib.build_filenamev([path, 'gnome-background-properties']))
    ].reduce(_addXMLPath, new Set());
}

function processXMLFromPath(path) {
    const contents = GLib.file_get_contents(path);
    return contents[0] ? processXML(contents[1]) : null;
}

function processXML(xmlText) {
    if (xmlText instanceof Uint8Array) xmlText = ByteArray.toString(xmlText);
    return parseXML(xmlText);
}

