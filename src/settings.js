'use strict';

const { Gio } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

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
    static CHANGE_ON_LOGIN = 'change-on-login';
    static USE_TIMER = 'use-timer';
    static TIMER = 'timer';
    static USE_BLACKLIST = 'use-blacklist';
    static WHITELIST = 'whitelist';
    static BLACKLIST = 'blacklist';
    static DIRECTORIES = 'directories';

    static getNewSchema() {
        const extensionUtils = imports.misc.extensionUtils;
        return extensionUtils.getSettings(extensionUtils.getCurrentExtension().metadata['settings-schema']);
    }

    constructor() { 
        super(WallpaperCarouselSettings.getNewSchema()); 
    }

    get changeOnLogin() {
        return this.getBoolean(WallpaperCarouselSettings.CHANGE_ON_LOGIN);
    }

    get useTimer() {
        return this.getBoolean(WallpaperCarouselSettings.USE_TIMER);
    }

    onChangedUseTimer(func) {
        this.onChanged(WallpaperCarouselSettings.USE_TIMER, func);
    }

    get timer() {
        return this.getInt(WallpaperCarouselSettings.TIMER);
    }

    onChangedTimer(func) {
        this.onChanged(WallpaperCarouselSettings.TIMER, func);
    }

    get useBlacklist() {
        return this.getBoolean(WallpaperCarouselSettings.USE_BLACKLIST);
    }

    onChangedUseBlacklist(func) {
        this.onChanged(WallpaperCarouselSettings.USE_BLACKLIST, func);
    }

    get whitelist() {
        return this.getStrv(WallpaperCarouselSettings.WHITELIST);
    }

    set whitelist(order) {
        this.setStrv(WallpaperCarouselSettings.WHITELIST, order);
    }

    onChangedWhitelist(func) {
        this.onChanged(WallpaperCarouselSettings.WHITELIST, func);
    }

    get blacklist() {
        return this.getStrv(WallpaperCarouselSettings.BLACKLIST);
    }

    set blacklist(order) {
        this.setStrv(WallpaperCarouselSettings.BLACKLIST, order);
    }

    onChangedBlacklist(func) {
        this.onChanged(WallpaperCarouselSettings.BLACKLIST, func);
    }

    get directories() {
        return this.getStrv(WallpaperCarouselSettings.DIRECTORIES);
    }

    set directories(directories) {
        this.setStrv(WallpaperCarouselSettings.DIRECTORIES, directories);
    }

    onChangedDirectories(func) {
        this.onChanged(WallpaperCarouselSettings.DIRECTORIES, func);
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