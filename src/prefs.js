'use strict';

const { Adw, Gio, GLib, Gtk, Gdk } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { WallpaperCarouselSettings, convertPathToURI, getAllWallpapers } = Me.imports.common;

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
    const builder = new Gtk.Builder();
    builder.add_from_file(`${Me.path}/ui/main.xml`);
    window.add(builder.get_object('general'));

    // Handle the timer
    const timerSpinButton = builder.get_object(WallpaperCarouselSettings.TIMER.replaceAll('-', '_'));
    wallpaperCarouselSettings.schema.bind(WallpaperCarouselSettings.TIMER, timerSpinButton, 'value', Gio.SettingsBindFlags.DEFAULT);

    // Get the widgets
    const wallpaperListWidget = builder.get_object("wallpaper_list");
    const wallpapers = getAllWallpapers();
    const order = wallpaperCarouselSettings.order;
    
    if (wallpapers.length === 0) {
        const row = new Adw.ActionRow();
        row.title = "No wallpapers found";
        wallpaperListWidget.add(row);
    } else {
        wallpapers.forEach((wallpaperData, index) => {
            const wallpaperRow = new Adw.ExpanderRow();
            wallpaperRow.title = wallpaperData.name;
            wallpaperRow.set_subtitle(wallpaperData.path);

            // Switch
            const wallpaperToggle = new Gtk.Switch();
            wallpaperToggle.set_valign(Gtk.Align.CENTER);
            wallpaperToggle.set_state(order.includes(wallpaperData.name));
            wallpaperToggle.connect("state-set", (_, state) => {
                if (state) order.push(decodeURI(wallpaperData.name));
                else order.splice(index, 1);
                wallpaperCarouselSettings.order = order;
            });
            wallpaperRow.add_action(wallpaperToggle);

            // Details
            const detailsRow = new Adw.ActionRow();
            if (wallpaperData.path.endsWith('.xml')) detailsRow.add_prefix(_createButton("Open XML", () => Gtk.show_uri(window, convertPathToURI(wallpaperData.path), Gdk.CURRENT_TIME)));
            if (wallpaperData.light === wallpaperData.dark) detailsRow.add_suffix(_createButton("Open Wallpaper", () => Gtk.show_uri(window, wallpaperData.light, Gdk.CURRENT_TIME)));
            else {
                detailsRow.add_suffix(_createButton("Open Light Wallpaper", () => Gtk.show_uri(window, wallpaperData.light, Gdk.CURRENT_TIME)));
                detailsRow.add_suffix(_createButton("Open Dark Wallpaper", () => Gtk.show_uri(window, wallpaperData.dark, Gdk.CURRENT_TIME)));
            }
            wallpaperRow.add_row(detailsRow);

            // Add row to widget
            wallpaperListWidget.add(wallpaperRow);
        });
    }
}

/**
 * Create a button with the specified label
 * 
 * @param {string} label 
 * @param {Func} onClicked
 * @returns {Gtk.Button} Button 
 */
function _createButton(label, onClicked) {
    const button = new Gtk.Button();
    button.set_valign(Gtk.Align.CENTER);
    button.set_label(label);
    button.vexpand = false;
    button.connect("clicked", onClicked);
    return button;
}