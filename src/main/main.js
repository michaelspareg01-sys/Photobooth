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

// Only the camera is ever granted, and only to our own page.
function allowCameraOnly(webContents, permission) {
  return permission === 'media' && webContents === win?.webContents;
}

ipcMain.handle('request-camera', async () => {
  if (process.platform !== 'darwin') return true;
  return systemPreferences.askForMediaAccess('camera');
});

ipcMain.handle('save-image', async (_event, { bytes, defaultName } = {}) => {
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
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback) => callback(allowCameraOnly(wc, permission)));
  session.defaultSession.setPermissionCheckHandler((wc, permission) => allowCameraOnly(wc, permission));
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
