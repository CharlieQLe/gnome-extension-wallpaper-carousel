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
const { WallpaperCarouselSettings, BackgroundSettings, convertPathToURI, getAllWallpapers, filterActiveWallpapers } = Me.imports.common;

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
        this._updateActiveWallpapers();
        this._timeInterval = this._settings.timer;
        this._activeIndex = this._getRandomInt(this._activeWallpapers.length);

        // Initial wallpaper
        this._setWallpaperToActive();
        
        // Quick settings
        this._toggle = new NextWallpaperToggle();
        this._toggle.connect("clicked", this._update.bind(this));
        QuickSettingsMenu._addItems([this._toggle]);

        // Start the loop
        this._updateLoop = Mainloop.timeout_add_seconds(this._timeInterval, this._update);

        this._settings.onChangedOrder(this._updateActiveWallpapers.bind(this));
    }

    disable() {
        Mainloop.source_remove(this._updateLoop);
        this._updateLoop = null;
        this._toggle.destroy();
        this._toggle = null;
        this._activeWallpapers = null;
        this._backgroundSettings = null;
        this._settings = null;
    }

    _getRandomInt(max) {
        return Math.floor(Math.random() * max);
    }

    _setWallpaperToActive() {
        const data = this._activeWallpapers[this._activeIndex];
        this._backgroundSettings.pictureUri = convertPathToURI(data.light);
        this._backgroundSettings.pictureUriDark = convertPathToURI(data.dark);
    }

    _updateActiveWallpapers() {
        const order = this._settings.order;
        this._activeWallpapers = getAllWallpapers().filter(wallpaperData => order.includes(wallpaperData.name));
    }

    _update() {
        const timer = this._settings.timer;
        if (this._timeInterval !== timer) {
            Mainloop.source_remove(this._updateLoop);
            this._timeInterval = timer;
            this._updateLoop = Mainloop.timeout_add_seconds(this._timeInterval, this._update);
        }
        this._activeIndex = (this._activeIndex + 1 + this._getRandomInt(this._activeWallpapers.length - 1)) % this._activeWallpapers.length;
        this._setWallpaperToActive();
        return true;
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
