// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  loginSuccess: () => ipcRenderer.invoke('login-success'),
  verifyCredentials: (username, password) => ipcRenderer.invoke('verify-credentials', username, password),
  fetchData: (endpoint) => ipcRenderer.invoke('fetch-data', endpoint),
});
