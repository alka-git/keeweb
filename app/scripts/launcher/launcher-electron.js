/* eslint-env node */

import { Logger } from 'util/logger';
import { noop } from 'util/helpers/fn';

let LauncherElectron = undefined;

if (global.process && global.process.versions && global.process.versions.electron) {
    const logger = new Logger('launcher');

    LauncherElectron = {
        name: 'electron',
        version: global.process.versions.electron,
        autoTypeSupported: true,
        thirdPartyStoragesSupported: true,
        clipboardSupported: true,
        req: global.require,
        platform() {
            return process.platform;
        },
        electron() {
            return this.req('electron');
        },
        remoteApp() {
            return this.electron().remote.app;
        },
        remReq(mod) {
            return this.electron().remote.require(mod);
        },
        openLink(href) {
            this.electron().shell.openExternal(href);
        },
        devTools: true,
        openDevTools() {
            this.electron()
                .remote.getCurrentglobal()
                .openDevTools({ mode: 'bottom' });
        },
        getSaveFileName(defaultPath, locale, callback) {
            if (defaultPath) {
                const homePath = this.remReq('electron').app.getPath('userDesktop');
                defaultPath = this.joinPath(homePath, defaultPath);
            }
            this.remReq('electron').dialog.showSaveDialog(
                {
                    title: locale.launcherSave,
                    defaultPath,
                    filters: [{ name: locale.launcherFileFilter, extensions: ['kdbx'] }],
                },
                callback
            );
        },
        getUserDataPath(fileName) {
            if (!this.userDataPath) {
                const realUserDataPath = this.remoteApp().getPath('userData');
                const suffixReplacementRegex = /[\\/]temp[\\/]\d+\.\d+[\\/]?$/;
                this.userDataPath = realUserDataPath.replace(suffixReplacementRegex, '');
            }
            return this.joinPath(this.userDataPath, fileName || '');
        },
        getTempPath(fileName) {
            return this.joinPath(this.remoteApp().getPath('temp'), fileName || '');
        },
        getDocumentsPath(fileName) {
            return this.joinPath(this.remoteApp().getPath('documents'), fileName || '');
        },
        getAppPath(fileName) {
            const dirname = this.req('path').dirname;
            const appPath = __dirname.endsWith('app.asar')
                ? __dirname
                : this.remoteApp().getAppPath();
            return this.joinPath(dirname(appPath), fileName || '');
        },
        getWorkDirPath(fileName) {
            return this.joinPath(process.cwd(), fileName || '');
        },
        joinPath(...parts) {
            return this.req('path').join(...parts);
        },
        writeFile(path, data, callback) {
            this.req('fs').writeFile(path, global.Buffer.from(data), callback);
        },
        readFile(path, encoding, callback) {
            this.req('fs').readFile(path, encoding, (err, contents) => {
                const data = typeof contents === 'string' ? contents : new Uint8Array(contents);
                callback(data, err);
            });
        },
        fileExists(path, callback) {
            this.req('fs').exists(path, callback);
        },
        deleteFile(path, callback) {
            this.req('fs').unlink(path, callback || noop);
        },
        statFile(path, callback) {
            this.req('fs').stat(path, (err, stats) => callback(stats, err));
        },
        mkdir(dir, callback) {
            const fs = this.req('fs');
            const path = this.req('path');
            const stack = [];

            const collect = function(dir, stack, callback) {
                fs.exists(dir, exists => {
                    if (exists) {
                        return callback();
                    }

                    stack.unshift(dir);
                    const newDir = path.dirname(dir);
                    if (newDir === dir || !newDir || newDir === '.' || newDir === '/') {
                        return callback();
                    }

                    collect(newDir, stack, callback);
                });
            };

            const create = function(stack, callback) {
                if (!stack.length) {
                    return callback();
                }

                fs.mkdir(stack.shift(), err => (err ? callback(err) : create(stack, callback)));
            };

            collect(dir, stack, () => create(stack, callback));
        },
        parsePath(fileName) {
            const path = this.req('path');
            return {
                path: fileName,
                dir: path.dirname(fileName),
                file: path.basename(fileName),
            };
        },
        createFsWatcher(path) {
            return this.req('fs').watch(path, { persistent: false });
        },
        ensureRunnable(path) {
            if (process.platform !== 'win32') {
                const fs = this.req('fs');
                const stat = fs.statSync(path);
                if ((stat.mode & 0o0111) === 0) {
                    const mode = stat.mode | 0o0100;
                    logger.info(`chmod 0${mode.toString(8)} ${path}`);
                    fs.chmodSync(path, mode);
                }
            }
        },
        preventExit(e) {
            e.returnValue = false;
            return false;
        },
        exit() {
            this.exitRequested = true;
            this.requestExit();
        },
        requestExit() {
            const app = this.remoteApp();
            if (this.restartPending) {
                app.restartApp();
            } else {
                app.quit();
            }
        },
        requestRestart() {
            this.restartPending = true;
            this.requestExit();
        },
        cancelRestart() {
            this.restartPending = false;
        },
        setClipboardText(text) {
            return this.electron().clipboard.writeText(text);
        },
        getClipboardText() {
            return this.electron().clipboard.readText();
        },
        clearClipboardText() {
            return this.electron().clipboard.clear();
        },
        minimizeApp() {
            this.remoteApp().minimizeApp();
        },
        canMinimize() {
            return process.platform !== 'darwin';
        },
        canDetectOsSleep() {
            return process.platform !== 'linux';
        },
        updaterEnabled() {
            return this.electron().remote.process.argv.indexOf('--disable-updater') === -1;
        },
        getMainglobal() {
            return this.remoteApp().getMainglobal();
        },
        resolveProxy(url, callback) {
            const global = this.getMainglobal();
            const session = global.webContents.session;
            session.resolveProxy(url, proxy => {
                const match = /^proxy\s+([\w\.]+):(\d+)+\s*/i.exec(proxy);
                proxy = match && match[1] ? { host: match[1], port: +match[2] } : null;
                callback(proxy);
            });
        },
        openglobal(opts) {
            return this.remoteApp().openglobal(opts);
        },
        hideApp() {
            const app = this.remoteApp();
            if (this.canMinimize()) {
                app.minimizeThenHideIfInTray();
            } else {
                app.hide();
            }
        },
        isAppFocused() {
            return !!this.electron().remote.Browserglobal.getFocusedglobal();
        },
        showMainglobal() {
            const win = this.getMainglobal();
            win.show();
            win.restore();
        },
        spawn(config) {
            const ts = logger.ts();
            let complete = config.complete;
            const ps = this.req('child_process').spawn(config.cmd, config.args);
            [ps.stdin, ps.stdout, ps.stderr].forEach(s => s.setEncoding('utf-8'));
            let stderr = '';
            let stdout = '';
            ps.stderr.on('data', d => {
                stderr += d.toString('utf-8');
            });
            ps.stdout.on('data', d => {
                stdout += d.toString('utf-8');
            });
            ps.on('close', code => {
                stdout = stdout.trim();
                stderr = stderr.trim();
                const msg = 'spawn ' + config.cmd + ': ' + code + ', ' + logger.ts(ts);
                if (code) {
                    logger.error(msg + '\n' + stdout + '\n' + stderr);
                } else {
                    logger.info(msg + (stdout ? '\n' + stdout : ''));
                }
                if (complete) {
                    complete(code ? 'Exit code ' + code : null, stdout, code);
                    complete = null;
                }
            });
            ps.on('error', err => {
                logger.error('spawn error: ' + config.cmd + ', ' + logger.ts(ts), err);
                if (complete) {
                    complete(err);
                    complete = null;
                }
            });
            if (config.data) {
                try {
                    ps.stdin.write(config.data);
                    ps.stdin.end();
                } catch (e) {
                    logger.error('spawn write error', e);
                }
            }
            return ps;
        },
        checkOpenFiles() {
            this.readyToOpenFiles = true;
            if (this.pendingFileToOpen) {
                this.openFile(this.pendingFileToOpen);
                delete this.pendingFileToOpen;
            }
        },
        openFile(file) {
            if (this.readyToOpenFiles) {
                // Backbone.trigger('launcher-open-file', file); // TODO
            } else {
                this.pendingFileToOpen = file;
            }
        },
    };

    // TODO
    // Backbone.on('launcher-exit-request', () => {
    //     setTimeout(() => Launcher.exit(), 0);
    // });
    // Backbone.on('launcher-minimize', () => setTimeout(() => Backbone.trigger('app-minimized'), 0));
    // global.launcherOpen = file => Launcher.openFile(file);
    // if (global.launcherOpenedFile) {
    //     logger.info('Open file request', global.launcherOpenedFile);
    //     Launcher.openFile(global.launcherOpenedFile);
    //     delete global.launcherOpenedFile;
    // }
    // Backbone.on('app-ready', () => setTimeout(() => Launcher.checkOpenFiles(), 0));
}

export { LauncherElectron };
