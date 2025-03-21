const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getRelayInfo: () => ipcRenderer.invoke('get-relay-info'),
  setRelayStore: (storeEnabled) => ipcRenderer.invoke('set-relay-store', storeEnabled),
  onRelayUpdate: (callback) => ipcRenderer.on('relay-update', (event, data) => callback(data)),
  send: (channel, data) => ipcRenderer.send(channel, data), // 添加 send 方法用于窗口控制
});