const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('photobooth', {
  saveImage: (bytes, defaultName) => ipcRenderer.invoke('save-image', { bytes, defaultName }),
  requestCamera: () => ipcRenderer.invoke('request-camera'),
});
