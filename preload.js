const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('bloxmind', {
  embedded: true,
  launchStudio: function () { return ipcRenderer.invoke('launch'); },
  openUrl: function (u) { return ipcRenderer.invoke('open', u); },
  copy: function (t) { return ipcRenderer.invoke('copy', t); },
  readClipboard: function () { return ipcRenderer.invoke('paste'); },
  studioErrors: function () { return ipcRenderer.invoke('studio-errors'); },
  pin: function (v) { ipcRenderer.send('pin', v); },
  setStudioModel: function (id) { ipcRenderer.send('studio-model', id); },
  onBridge: function (cb) { ipcRenderer.on('bridge', function (e, m) { cb(m); }); },
  onStudio: function (cb) { ipcRenderer.on('studio', function (e, v) { cb(v); }); },
  views: {
    set: function (list) { ipcRenderer.send('views-set', list); },
    send: function (id, url) { return ipcRenderer.invoke('views-send', id, url); },
    reload: function (id) { return ipcRenderer.invoke('views-reload', id); },
    external: function (id) { return ipcRenderer.invoke('views-external', id); }
  },
  win: {
    minimize: function () { ipcRenderer.send('min'); },
    maximize: function () { ipcRenderer.send('max'); },
    close: function () { ipcRenderer.send('close'); }
  }
});
