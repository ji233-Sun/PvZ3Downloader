const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 下载相关API
  startDownload: (config) => ipcRenderer.invoke('start-download', config),
  stopDownload: () => ipcRenderer.invoke('stop-download'),
  
  // 文件系统API
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  selectCatalogFile: () => ipcRenderer.invoke('select-catalog-file'),
  
  // 应用信息API
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getDownloadConfig: () => ipcRenderer.invoke('get-download-config'),
  getUserConfig: () => ipcRenderer.invoke('get-user-config'),
  saveUserConfig: (config) => ipcRenderer.invoke('save-user-config', config),
  
  // 事件监听器
  onDownloadStarted: (callback) => ipcRenderer.on('download-started', callback),
  onDownloadCompleted: (callback) => ipcRenderer.on('download-completed', callback),
  onDownloadStopped: (callback) => ipcRenderer.on('download-stopped', callback),
  onDownloadError: (callback) => ipcRenderer.on('download-error', callback),
  onProgressUpdate: (callback) => ipcRenderer.on('progress-update', callback),
  onLogMessage: (callback) => ipcRenderer.on('log-message', callback),
  onDirectorySelected: (callback) => ipcRenderer.on('directory-selected', callback),
  
  // 移除监听器
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  
  // 平台信息
  platform: process.platform,
  
  // 路径工具
  joinPath: (...args) => require('path').join(...args),
  
  // 系统信息
  getSystemInfo: () => ({
    platform: process.platform,
    arch: process.arch,
    version: process.versions
  })
});