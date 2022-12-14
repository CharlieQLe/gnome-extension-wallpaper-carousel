'use strict';

const { Adw, Gio, GLib, Gtk, Gdk } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { WallpaperCarouselSettings, BackgroundSettings } = Me.imports.settings;
const { convertPathToURI } = Me.imports.common;
const { WallpaperUtility } = Me.imports.wallpaperUtils;

/**
 * Like `extension.js` this is used for any one-time setup like translations.
 *
 * @param {ExtensionMeta} meta - An extension meta object, described below.
 */
function init(meta) { }

/**
 * This function is called when the preferences window is first created to fill
 * the `Adw.PreferencesWindow`.
 *
 * This function will only be called by GNOME 42 and later. If this function is
 * present, `buildPrefsWidget()` will never be called.
 *
 * @param {Adw.PreferencesWindow} window - The preferences window
 */
function fillPreferencesWindow(window) {
    const wallpaperCarouselSettings = new WallpaperCarouselSettings();
    const backgroundSettings = new BackgroundSettings();
    const builder = new Gtk.Builder();
    builder.add_from_file(`${Me.path}/ui/main.xml`);
    window.add(builder.get_object('general'));

    function bindWidget(key, field) {
        wallpaperCarouselSettings.schema.bind(key, builder.get_object(key.replaceAll('-', '_')), field, Gio.SettingsBindFlags.DEFAULT);
    }

    // Handle change on login
    bindWidget(WallpaperCarouselSettings.CHANGE_ON_LOGIN, 'active');
    bindWidget(WallpaperCarouselSettings.USE_TIMER, 'active');
    bindWidget(WallpaperCarouselSettings.TIMER, 'value');
    bindWidget(WallpaperCarouselSettings.USE_BLACKLIST, 'active');
    
    // Get the widgets
    const wallpaperListWidget = builder.get_object("wallpaper_list");
    const wallpaperToggles = [];
    
    // Get wallpapers
    const wallpapers = WallpaperUtility.getAllWallpapers();

    // Get whitelist or blacklist
    let targetList = wallpaperCarouselSettings.useBlacklist ? wallpaperCarouselSettings.blacklist : wallpaperCarouselSettings.whitelist;

    // Build rows
    if (wallpapers.length === 0) {
        // Handle the case of no wallpapers
        wallpaperListWidget.add(new Adw.ActionRow({ title: "No wallpapers found" }));
    } else {
        // Handle the case of any wallpapers
        wallpapers.forEach(wallpaperData => {
            const wallpaperRow = new Adw.ExpanderRow({
                title: wallpaperData.name,
                subtitle: wallpaperData.path
            });

            // Switch
            const wallpaperToggle = new Gtk.Switch({
                valign: Gtk.Align.CENTER,
                state: targetList.includes(wallpaperData.name)
            });
            wallpaperToggle.connect("state-set", (_, state) => {
                if (state) targetList.push(decodeURI(wallpaperData.name));
                else targetList.splice(targetList.indexOf(wallpaperData.name), 1);
                if (wallpaperCarouselSettings.useBlacklist) wallpaperCarouselSettings.blacklist = targetList;
                else wallpaperCarouselSettings.whitelist = targetList;
            });
            wallpaperRow.add_action(wallpaperToggle);

            // Details
            const detailsRow = new Adw.ActionRow();
            if (wallpaperData.path.endsWith('.xml')) detailsRow.add_prefix(_createButton("Open XML", () => Gtk.show_uri(window, convertPathToURI(wallpaperData.path), Gdk.CURRENT_TIME)));
            if (wallpaperData.isThemed) {
                detailsRow.add_suffix(_createButton("Open Light Wallpaper", () => Gtk.show_uri(window, wallpaperData.lightUri, Gdk.CURRENT_TIME)));
                detailsRow.add_suffix(_createButton("Open Dark Wallpaper", () => Gtk.show_uri(window, wallpaperData.darkUri, Gdk.CURRENT_TIME)));
            } else detailsRow.add_suffix(_createButton("Open Wallpaper", () => Gtk.show_uri(window, wallpaperData.lightUri, Gdk.CURRENT_TIME)));
            detailsRow.add_suffix(_createButton("Set Wallpaper", () => {
                backgroundSettings.pictureUri = wallpaperData.lightUri;
                backgroundSettings.pictureUriDark = wallpaperData.darkUri;
            }));
            wallpaperRow.add_row(detailsRow);

            // Add row to widget
            wallpaperListWidget.add(wallpaperRow);
            wallpaperToggles.push({
                name: wallpaperData.name,
                toggle: wallpaperToggle
            });
        });
    }

    // Change states as needed
    wallpaperCarouselSettings.onChangedUseBlacklist(() => {
        targetList = wallpaperCarouselSettings.useBlacklist ? wallpaperCarouselSettings.blacklist : wallpaperCarouselSettings.whitelist;
        wallpaperToggles.forEach(data => data.toggle.state = targetList.includes(data.name))
    });
}

/**
 * Create a button with the specified label
 * 
 * @param {string} label 
 * @param {Func} onClicked
 * @returns {Gtk.Button} Button 
 */
function _createButton(label, onClicked) {
    const button = new Gtk.Button({
        valign: Gtk.Align.CENTER,
        vexpand: false,
        label: label
    });
    button.connect("clicked", onClicked);
    return button;
}