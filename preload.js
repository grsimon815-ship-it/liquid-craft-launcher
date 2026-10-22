const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Real Minecraft Download from BMCLAPI
  installMinecraft: (versionId) => ipcRenderer.invoke('minecraft-install', versionId),
  onInstallProgress: (callback) => {
    ipcRenderer.on('minecraft-install-progress', (event, data) => callback(data));
  },

  // Real Minecraft Launch
  launchMinecraft: (options) => ipcRenderer.invoke('minecraft-launch', options),
  onLaunchLog: (callback) => {
    ipcRenderer.on('minecraft-launch-log', (event, log) => callback(log));
  },

  // File explorer & Installed versions
  openFolder: (folderPath) => ipcRenderer.send('open-folder', folderPath),
  getInstalledVersions: () => ipcRenderer.invoke('get-installed-versions')
});
