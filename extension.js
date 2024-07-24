import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as ExtensionUtils from 'resource:///org/gnome/shell/misc/extensionUtils.js';

import { getLatestData, getLastFetched, updateTime } from './fetchData.js';

export default class TimeAPIIndicatorExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._indicator = null;
    }

    enable() {
        this._indicator = GObject.registerClass(
            class Indicator extends PanelMenu.Button {
                _init() {
                    super._init(0.0, _('Time API Indicator'));

                    this._label = new St.Label({
                        text: 'Loading...',
                        y_align: Clutter.ActorAlign.CENTER,
                    });

                    this.add_child(this._label);

                    this._timeoutId = null;
                    this._updateLabel();
                }

                _updateLabel() {
                    let currentTime = new Date();
                    let latestData = getLatestData();
                    if (latestData) {
                        let dataAge = (currentTime - getLastFetched()) / 1000;
                        if (dataAge > 20) { //Change to 300!
                            this._label.set_text(`(${latestData})`);
                        } else {
                            this._label.set_text(latestData);
                        }
                    } else {
                        this._label.set_text('(No data)');
                        log('Still no data...');
                    }

                    this._resetTimer();
                }

                _resetTimer(seconds = 5) {
                    if (this._timeoutId) {
                        GLib.source_remove(this._timeoutId);
                    }
                    this._timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, seconds, () => {
                        this._updateLabel();
                        return GLib.SOURCE_CONTINUE;
                    });
                }

                destroy() {
                    if (this._timeoutId) {
                        GLib.source_remove(this._timeoutId);
                        this._timeoutId = null;
                    }
                    super.destroy();
                }
            }
        );

        this._indicatorInstance = new this._indicator();
        Main.panel.addToStatusArea(this.uuid, this._indicatorInstance);
    }

    disable() {
        if (this._indicatorInstance) {
            this._indicatorInstance.destroy();
            this._indicatorInstance = null;
        }
    }
}

export function init(metadata) {
    return new TimeAPIIndicatorExtension(metadata);
}

