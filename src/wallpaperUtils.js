'use strict';

const { Gio, GLib } = imports.gi;
const ByteArray = imports.byteArray;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { convertPathToURI, forEachFile } = Me.imports.common;
const { parseXML } = Me.imports.xmlParser;

var USER_DIRECTORY_XML = GLib.build_filenamev([GLib.get_user_data_dir(), 'gnome-background-properties']);
var USER_DIRECTORY_IMAGE = GLib.build_filenamev([GLib.get_user_data_dir(), 'backgrounds']);
var USER_DIRECTORIES = [USER_DIRECTORY_XML, USER_DIRECTORY_IMAGE];
var SYSTEM_DIRECTORY_XML = GLib.build_filenamev(['/usr/share', 'gnome-background-properties']);
var SYSTEM_DIRECTORY_IMAGE = GLib.build_filenamev(['/usr/share', 'backgrounds']);
var SYSTEM_DIRECTORIES = [SYSTEM_DIRECTORY_XML, SYSTEM_DIRECTORY_IMAGE];

var WallpaperData = class {
    constructor(name, fileName, path, lightUri, darkUri) {
        this._name = name;
        this._fileName = fileName;
        this._path = path;
        this._lightUri = lightUri;
        this._darkUri = darkUri;
    }

    get name() {
        return this._name;
    }

    get fileName() {
        return this._fileName;
    }

    get path() {
        return this._path;
    }

    get lightUri() {
        return this._lightUri;
    }

    get darkUri() {
        return this._darkUri;
    }

    get isThemed() {
        return this._lightUri === this.darkUri;
    }
}

var WallpaperUtility = class {
    /**
     * Get the user wallpapers.
     * 
     * @returns {Array<string>} Wallpapers
     */
    static getUserWallpapers() {
        return [
            ...this.getWallpapersForDirectoryFromXML(USER_DIRECTORY_XML),
            ...this.getWallpapersForDirectoryFromImage(USER_DIRECTORY_IMAGE)
        ];
    }

    /**
     * Get the system wallpapers.
     * 
     * @returns {Array<string>} Wallpapers
     */
    static getSystemWallpapers() {
        return [
            ...this.getWallpapersForDirectoryFromXML(SYSTEM_DIRECTORY_XML),
            ...this.getWallpapersForDirectoryFromImage(SYSTEM_DIRECTORY_IMAGE)
        ];
    }

    /**
     * Get all wallpapers.
     * 
     * @returns {Array<WallpaperData>} Wallpapers
     */
    static getAllWallpapers() {
        return [...this.getUserWallpapers(), ...this.getSystemWallpapers()];
    }

    /**
     * Get wallpapers from a directory based on XML files.
     * 
     * @param {string} directory 
     * @returns {Array<WallpaperData>}
     */
    static getWallpapersForDirectoryFromXML(directory) {
        const wallpapers = [];

        // Iterate over each file in the directory
        forEachFile(directory, file => {
            // Do nothing if the file is not a file at all
            if (file.query_file_type(Gio.FileQueryInfoFlags.NONE, null) !== Gio.FileType.REGULAR) return;

            // Try to parse the wallpaper XML
            const path = file.get_path();
            if (!path.endsWith('.xml')) return;
            const contents = GLib.file_get_contents(path);
            if (!contents[0]) return;
            let xmlText = contents[1];
            if (xmlText instanceof Uint8Array) xmlText = ByteArray.toString(xmlText);
            const parsedXml = parseXML(xmlText);
            const baseName = file.get_basename();

            // Get wallpaper data
            let name = baseName;
            let light = '';
            let dark = '';

            // Iterate over the XML file
            parsedXml.f.forEach(wallpapersData => {
                // Do nothing if the current node is not the wallpaper
                if (wallpapersData.n.toLowerCase() !== 'wallpapers') return;
                const wallpaperData = wallpapersData.f[0];
                if (wallpaperData.n.toLowerCase() !== 'wallpaper') return;
                
                // Check nodes for names and populate the appropriate fields
                wallpaperData.f.forEach(x => {
                    switch (x.n.toLowerCase()) {
                        case 'filename': light = x.f[0].trim(); break;
                        case 'filename-dark': dark = x.f[0].trim(); break;
                        case 'name': name = x.f[0].trim(); break;
                    }
                });
            });

            // Ensure that both the light and dark fields are populated
            const lightEmpty = light === '';
            const darkEmpty = dark === '';
            if (lightEmpty && darkEmpty) return;
            else if (lightEmpty) light = dark;
            else if (darkEmpty) dark = light;

            // Do not add data if the light or dark wallpapers don't exist
            if (Gio.File.new_for_path(light).query_file_type(Gio.FileQueryInfoFlags.NONE, null) !== Gio.FileType.REGULAR ||
                Gio.File.new_for_path(dark).query_file_type(Gio.FileQueryInfoFlags.NONE, null) !== Gio.FileType.REGULAR) return; 
            
            // Add wallpaper data
            wallpapers.push(new WallpaperData(name, baseName, path, convertPathToURI(light), convertPathToURI(dark)));
        });

        return wallpapers;
    }

    /**
     * Get wallpapers from a directory based on image files.
     * 
     * @param {string} directory 
     * @returns 
     */
    static getWallpapersForDirectoryFromImage(directory) {
        const wallpapers = [];
        forEachFile(directory, file => {
            const path = file.get_path();
            const baseName = file.get_basename();
            const pathLower = path.toLowerCase();

            // If this wallpaper is not an image, do not add it
            if (!pathLower.endsWith('.jpg') && !pathLower.endsWith('.jpeg') && !pathLower.endsWith('.png') && !pathLower.endsWith('.webp')) return;

            // Add the wallpaper data
            const uri = convertPathToURI(path);
            wallpapers.push(new WallpaperData(baseName, baseName, path, uri, uri));
        });
        return wallpapers;
    }

    /**
     * Get the active wallpapers from a list of wallpapers based on a list of names.
     * 
     * @param {Array<WallpaperData>} wallpapers 
     * @param {Array<string>} activeWallpaperNames 
     * @returns {Array<WallpaperData>} Active wallpapers
     */
    static getActiveWallpapers(wallpapers, activeWallpaperNames) {
        return wallpapers.filter(data => activeWallpaperNames.includes(data.name));
    }

    /**
     * Sort wallpapers by their names.
     * 
     * @param {Array<WallpaperData>} wallpapers 
     * @returns {Array<WallpaperData>} The wallpaper array
     */
    static sortWallpapers(wallpapers) {
        wallpapers.sort((a, b) => (a.name < b.name) ? -1 : (a.name > b.name ? 1 : 0));
        return wallpapers;
    }
}