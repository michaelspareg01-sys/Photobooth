import { app, BrowserWindow, dialog, ipcMain, session, systemPreferences } from 'electron';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SAVE_FILTERS = {
  png: { name: 'PNG image', extensions: ['png'] },
  jpg: { name: 'JPEG image', extensions: ['jpg', 'jpeg'] },
};

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1060,
    minHeight: 700,
    title: 'Photobooth',
    backgroundColor: '#17151c',
    show: false,
    webPreferences: {
      preload: path.join(here, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event) => event.preventDefault());
  win.loadFile(path.join(here, '..', 'renderer', 'index.html'));
}

const isOurPage = (webContents) => webContents === win?.webContents;

// Only the camera (never the microphone) is granted, and only to our own page.
function allowCameraRequest(webContents, permission, details) {
  const types = details?.mediaTypes ?? [];
  return isOurPage(webContents) && permission === 'media' && types.length > 0 && types.every((t) => t === 'video');
}

function allowCameraCheck(webContents, permission, details) {
  return isOurPage(webContents) && permission === 'media' && details?.mediaType !== 'audio';
}

// IPC is only answered for our own top-level page.
function fromOurPage(event) {
  return isOurPage(event.sender) && event.senderFrame === event.sender.mainFrame;
}

ipcMain.handle('request-camera', async (event) => {
  if (!fromOurPage(event)) return false;
  if (process.platform !== 'darwin') return true;
  return systemPreferences.askForMediaAccess('camera');
});

ipcMain.handle('save-image', async (event, { bytes, defaultName } = {}) => {
  if (!fromOurPage(event)) throw new Error('Unexpected sender');
  if (!(bytes instanceof Uint8Array) || typeof defaultName !== 'string') {
    throw new Error('Invalid save request');
  }
  const ext = path.extname(defaultName).slice(1).toLowerCase();
  const filter = SAVE_FILTERS[ext];
  if (!filter) throw new Error(`Unsupported file type: ${ext}`);
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Save photo booth print',
    defaultPath: path.join(app.getPath('pictures'), path.basename(defaultName)),
    filters: [filter],
  });
  if (canceled || !filePath) return { saved: false };
  await writeFile(filePath, bytes);
  return { saved: true, path: filePath };
});

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback, details) => callback(allowCameraRequest(wc, permission, details)));
  session.defaultSession.setPermissionCheckHandler((wc, permission, _origin, details) => allowCameraCheck(wc, permission, details));
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
