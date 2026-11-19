const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  quit: () => ipcRenderer.send("app:quit"),
  // Return the absolute path of a picked File (Electron only).
  getPathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file);
    } catch {
      return null;
    }
  },
});
