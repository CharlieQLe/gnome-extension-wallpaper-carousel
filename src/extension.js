'use strict';

/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* exported init */

const { GObject } = imports.gi;

const Mainloop = imports.mainloop;

const QuickSettings = imports.ui.quickSettings;
const QuickSettingsMenu = imports.ui.main.panel.statusArea.quickSettings;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { WallpaperCarouselSettings, BackgroundSettings, getAllWallpapers } = Me.imports.common;

const NextWallpaperToggle = class NextWallpaperToggle extends QuickSettings.QuickToggle {
    static {
        GObject.registerClass(this);
    }

    _init() {
        super._init({
            label: 'Next Wallpaper',
            iconName: 'preferences-desktop-wallpaper-symbolic',
            toggleMode: false,
        });
    }
}

class Extension {
    constructor(uuid) {
        this._uuid = uuid;
    }

    enable() {
        this._settings = new WallpaperCarouselSettings();
        this._backgroundSettings = new BackgroundSettings();
        this._timeInterval = this._settings.timer;
        this._resetWallpapers();

        // Initial wallpaper
        this._setWallpaper();
        
        // Quick settings
        this._toggle = new NextWallpaperToggle();
        this._toggle.connect("clicked", this._update.bind(this));
        QuickSettingsMenu._addItems([this._toggle]);

        // Start the loop
        this._updateLoop = Mainloop.timeout_add_seconds(this._timeInterval, this._update.bind(this));

        // Update the wallpapers on change
        this._settings.onChangedOrder(this._updateQueuedWallpapers.bind(this));
    }

    disable() {
        Mainloop.source_remove(this._updateLoop);
        this._updateLoop = null;
        this._toggle.destroy();
        this._toggle = null;
        this._queuedWallpapers = null;
        this._visitedWallpapers = null;
        this._backgroundSettings = null;
        this._settings = null;
    }

    _setWallpaper() {
        const data = this._queuedWallpapers.splice(Math.floor(Math.random() * this._queuedWallpapers.length), 1)[0];
        this._visitedWallpapers.push(data.name);
        this._backgroundSettings.pictureUri = data.light;
        this._backgroundSettings.pictureUriDark = data.dark;
        if (this._queuedWallpapers.length === 0) this._resetWallpapers();
    }

    _updateQueuedWallpapers() {
        const order = this._settings.order;
        this._queuedWallpapers = getAllWallpapers().filter(wallpaperData => order.includes(wallpaperData.name) && !this._visitedWallpapers.includes(wallpaperData.name));
        if (this._queuedWallpapers.length === 0) this._resetWallpapers();
    }

    _resetWallpapers() {
        this._visitedWallpapers = [];
        const order = this._settings.order;
        this._queuedWallpapers = getAllWallpapers().filter(wallpaperData => order.includes(wallpaperData.name));
    }

    _update() {
        const timer = this._settings.timer;
        if (this._timeInterval !== timer) {
            Mainloop.source_remove(this._updateLoop);
            this._timeInterval = timer;
            this._updateLoop = Mainloop.timeout_add_seconds(this._timeInterval, this._update.bind(this));
        }
        this._setWallpaper();
        return true;
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
