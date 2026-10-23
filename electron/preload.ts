import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('binran', {
  message(text) {
    return ipcRenderer.invoke('message', text)
  },
})
