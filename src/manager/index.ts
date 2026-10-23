import { ipcMain } from 'electron'

ipcMain.handle('message', (_, text) => {
  console.log(text)
})
