import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Soup from 'gi://Soup';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import Meta from 'gi://Meta';


export const getLatestData = () => globalThis.latestData;
export const getLastFetched = () => globalThis.lastFetched;

let screenBlanked = false;

const fetchData = async () => {
    if (screenBlanked) {
        log('Screen is blanked, skipping fetch.');
        return;
    }
    let session = new Soup.Session();
    let message = Soup.Message.new('GET', 'http://worldtimeapi.org/api/timezone/Europe/Stockholm');

    return new Promise((resolve, reject) => {
        session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (session, result) => {
            try {
                let response = session.send_and_read_finish(result);
                if (message.get_status() === Soup.Status.TOO_MANY_REQUESTS) {
                    let resetTime = response.get_http_headers().get_one('Retry-After');
                    globalThis.rateLimitReset = Date.now() + (resetTime * 1000);
                    reject(new Error('Rate limited'));
                    return;
                }
                let decoder = new TextDecoder('utf-8');
                let jsonString = decoder.decode(response.get_data());
                let data = JSON.parse(jsonString);
                resolve(data.datetime);
            } catch (e) {
                log('Error parsing JSON: FAILED' + e);
                reject(e);
            }
        });
    });
}

export const updateTime = async () => {
    if (globalThis.fetchInProgress || screenBlanked) {
        resetTimer();
        return;
    }

    let currentTime = Date.now();
    if (currentTime < globalThis.rateLimitReset) {
        resetTimer((globalThis.rateLimitReset - currentTime) / 1000);
        return;
    }

    globalThis.fetchInProgress = true;

    try {
        log('Fetching new time...');
        let datetime = await fetchData();
        log('Time fetched');
        globalThis.latestData = datetime;
        globalThis.lastFetched = new Date();
    } catch (e) {
        log(e.message);
    } finally {
        globalThis.fetchInProgress = false;
        resetTimer();
    }
}

const resetTimer = (seconds = 30) => {
    if (globalThis.timeoutId) {
        GLib.source_remove(globalThis.timeoutId);
    }
    globalThis.timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, seconds, () => {
        updateTime();
        return GLib.SOURCE_CONTINUE;
    });
}

const onMonitorsChanged = () => {
    let monitors = Meta.MonitorManager.get().get_monitors();
    screenBlanked = monitors.every(monitor => monitor.is_blank());
    log('screenBlanked:' + screenBlanked);
    if (!screenBlanked) {
        // Screen became active, trigger an immediate fetch
        updateTime();
    }
}

// Initialize the fetch process
globalThis.fetchInProgress = false;
globalThis.rateLimitReset = 0;
globalThis.timeoutId = null;
Main.layoutManager.connect('monitors-changed', onMonitorsChanged);
updateTime();


