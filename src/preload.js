const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  selectAudioFile: () => ipcRenderer.invoke('select-audio-file'),
  processAudio: (filePath, settings) => ipcRenderer.send('process-audio', filePath, settings),
  
  // Progress & output event listeners
  onProgress: (callback) => {
    const subscription = (_event, data) => callback(data)
    ipcRenderer.on('pipeline-progress', subscription)
    return () => ipcRenderer.removeListener('pipeline-progress', subscription)
  },
  onComplete: (callback) => {
    const subscription = (_event, data) => callback(data)
    ipcRenderer.on('pipeline-complete', subscription)
    return () => ipcRenderer.removeListener('pipeline-complete', subscription)
  },
  onError: (callback) => {
    const subscription = (_event, data) => callback(data)
    ipcRenderer.on('pipeline-error', subscription)
    return () => ipcRenderer.removeListener('pipeline-error', subscription)
  }
})
