'use strict';

const { Adw, Gio, GLib, Gtk, Gdk } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { WallpaperCarouselSettings, convertPathToURI, getAllWallpapers, filterActiveWallpapers, filterInactiveWallpapers } = Me.imports.common;

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
    const activeWallpaperListWidget = builder.get_object("active_wallpaper_list");
    const inactiveWallpaperListWidget = builder.get_object("inactive_wallpaper_list");
    let activeWallpaperWidgetChildren = [];
    let inactiveWallpaperWidgetChildren = [];
    let order = wallpaperCarouselSettings.order;

    rebuild();

    function rebuild() {
        // Update order
        order = order.map(name => decodeURI(name));
        wallpaperCarouselSettings.order = order;

        // Get the wallpapers
        const wallpapers = getAllWallpapers();
        const activeWallpapers = filterActiveWallpapers(wallpapers, order);
        const inactiveWallpapers = filterInactiveWallpapers(wallpapers, order);

        // Get the widgets
        activeWallpaperWidgetChildren.forEach(child => activeWallpaperListWidget.remove(child));
        inactiveWallpaperWidgetChildren.forEach(child => inactiveWallpaperListWidget.remove(child));
        activeWallpaperWidgetChildren = [];
        inactiveWallpaperWidgetChildren = [];

        // Handle active wallpapers
        if (activeWallpapers.length === 0) {
            const row = _createNoneRow();
            activeWallpaperWidgetChildren.push(row);
            activeWallpaperListWidget.add(row);
        } else {
            activeWallpapers.forEach((data, index) => {
                const wallpaperRow = new Adw.ExpanderRow();
                wallpaperRow.title = data.name;

                // Button to move down
                const downButton = _createButtonIcon("go-down-symbolic", () => {
                    order.splice(index + 1, 0, order.splice(index, 1));
                    rebuild();
                });
                downButton.set_sensitive(index < activeWallpapers.length - 1);
                wallpaperRow.add_action(downButton);
                
                // Button to move up
                const upButton = _createButtonIcon("go-up-symbolic", () => {
                    order.splice(index - 1, 0, order.splice(index, 1));
                    rebuild();
                });
                upButton.set_sensitive(index > 0);
                wallpaperRow.add_action(upButton);

                // Details row
                const detailsRow = new Adw.ActionRow();
                if (data.light === data.dark) {
                    detailsRow.add_suffix(_createButtonLabelled("Open Wallpaper", () => Gtk.show_uri(window, convertPathToURI(data.light), Gdk.CURRENT_TIME)));
                } else {
                    detailsRow.add_suffix(_createButtonLabelled("Open Light Wallpaper", () => Gtk.show_uri(window, convertPathToURI(data.light), Gdk.CURRENT_TIME)));
                    detailsRow.add_suffix(_createButtonLabelled("Open Dark Wallpaper", () => Gtk.show_uri(window, convertPathToURI(data.dark), Gdk.CURRENT_TIME)));
                }

                // Remove button
                const removeButton = _createButtonIcon("list-remove-symbolic", () => {
                    order.splice(index, 1);
                    rebuild();
                });
                removeButton.add_css_class("destructive-action");
                detailsRow.add_suffix(removeButton);
                wallpaperRow.add_row(detailsRow);
                
                // Update children
                activeWallpaperWidgetChildren.push(wallpaperRow);
                activeWallpaperListWidget.add(wallpaperRow);
            });
        }

        // Handle inactive wallpapers
        if (inactiveWallpapers.length === 0) {
            const row = _createNoneRow();
            inactiveWallpaperWidgetChildren.push(row);
            inactiveWallpaperListWidget.add(row);
        } else {
            inactiveWallpapers.forEach(data => {
                const wallpaperRow = new Adw.ExpanderRow();
                wallpaperRow.title = data.name;

                // Action
                const addButton = _createButtonIcon("list-add-symbolic", () => {
                    order.push(data.name);
                    rebuild();
                });
                addButton.add_css_class("flat");
                wallpaperRow.add_action(addButton);
                
                // Details row
                const detailsRow = new Adw.ActionRow();
                if (data.light === data.dark) {
                    detailsRow.add_suffix(_createButtonLabelled("Open Wallpaper", () => Gtk.show_uri(window, convertPathToURI(data.light), Gdk.CURRENT_TIME)));
                } else {
                    detailsRow.add_suffix(_createButtonLabelled("Open Light Wallpaper", () => Gtk.show_uri(window, convertPathToURI(data.light), Gdk.CURRENT_TIME)));
                    detailsRow.add_suffix(_createButtonLabelled("Open Dark Wallpaper", () => Gtk.show_uri(window, convertPathToURI(data.dark), Gdk.CURRENT_TIME)));
                }
                wallpaperRow.add_row(detailsRow);

                // Update children
                inactiveWallpaperWidgetChildren.push(wallpaperRow);
                inactiveWallpaperListWidget.add(wallpaperRow);
            });
        }

    }
}

/**
 * Create a row that handles an empty set of wallpapers.
 * 
 * @returns {Adw.ActionRow} Row
 */
function _createNoneRow() {
    const row = new Adw.ActionRow();
    row.title = "No wallpapers found";
    return row;
}

/**
 * Create a button with the specified label
 * 
 * @param {string} label 
 * @param {Func} onClicked
 * @returns {Gtk.Button} Button 
 */
function _createButtonLabelled(label, onClicked) {
    const button = new Gtk.Button();
    button.set_valign(Gtk.Align.CENTER);
    button.set_label(label);
    button.vexpand = false;
    button.connect("clicked", onClicked);
    return button;
}

/**
 * Create a link button.
 * 
 * @param {string} uri 
 * @param {string} label 
 * @returns {Gtk.LinkButton} Link button
 */
function _createLinkButton(uri, label) {
    const button = Gtk.LinkButton.new_with_label(uri, label);
    button.set_valign(Gtk.Align.CENTER);
    button.vexpand = false;
    return button;
}

/**
 * Create a button with the specified icon
 * 
 * @param {string} icon_name 
 * @param {Func} onClicked
 * @returns {Gtk.Button} Button 
 */
 function _createButtonIcon(icon_name, onClicked) {
    const button = new Gtk.Button();
    button.set_valign(Gtk.Align.CENTER);
    button.set_icon_name(icon_name);
    button.vexpand = false;
    button.connect("clicked", onClicked);
    return button;
}