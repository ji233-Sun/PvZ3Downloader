const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const log = require('electron-log');
const { autoUpdater } = require('electron-updater');

// 设置日志配置
log.transports.file.level = 'info';
autoUpdater.logger = log;

class PvZ3ResourceDownloader {
  constructor() {
    this.mainWindow = null;
    this.downloadState = {
      isDownloading: false,
      progress: { total: 0, completed: 0, failed: 0 },
      currentPlatform: null
    };
    
    // 下载配置
    this.config = {
      maxRetries: 3,           // 每个文件最大重试次数
      retryDelay: 1000,        // 基础重试延迟（毫秒）
      maxRetryDelay: 10000,    // 最大重试延迟（毫秒）
      timeout: 60000           // 请求超时时间（毫秒）
    };
    
    // 用户配置文件路径
    this.configPath = path.join(require('os').homedir(), '.pvz3-downloader-config.json');
    this.userConfig = this.loadUserConfig();
    
    // PvZ3中国版CDN基础URL
    this.BASE_CDN_URL = 'https://pvz3cdn.mengxingstar.com/ppp/cn_prod/client-assets';
    this.SUPPORTED_PLATFORMS = ['iOS', 'Android'];
  }

  // 加载用户配置
  loadUserConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        return JSON.parse(configData);
      }
    } catch (error) {
      log.warn('Failed to load user config:', error);
    }
    
    // 返回默认配置
    return {
      lastDownloadPath: path.join(require('os').homedir(), 'Downloads'),
      lastPlatform: 'iOS',
      lastConcurrent: 10,
      createSubFolder: true
    };
  }

  // 保存用户配置
  saveUserConfig() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.userConfig, null, 2));
    } catch (error) {
      log.error('Failed to save user config:', error);
    }
  }

  createWindow() {
    // 创建浏览器窗口
    this.mainWindow = new BrowserWindow({
      width: 900,
      height: 700,
      minWidth: 600,
      minHeight: 500,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js')
      },
      icon: this.getIconPath(),
      title: 'PvZ3中国版资源下载器',
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      show: false // 先不显示，等待ready-to-show事件
    });

    // 加载应用的HTML文件
    const htmlPath = path.join(__dirname, '../gui/index.html');
    this.mainWindow.loadFile(htmlPath);

    // 优雅地显示窗口
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      
      // 开发模式下打开开发者工具
      if (process.argv.includes('--dev')) {
        this.mainWindow.webContents.openDevTools();
      }
    });

    // 当窗口被关闭时触发
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // 防止新窗口打开
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    // 设置菜单
    this.createMenu();
  }

  createMenu() {
    const template = [
      {
        label: '文件',
        submenu: [
          {
            label: '选择下载目录',
            accelerator: 'CmdOrCtrl+O',
            click: () => this.selectDownloadDirectory()
          },
          { type: 'separator' },
          {
            label: '退出',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => app.quit()
          }
        ]
      },
      {
        label: '下载',
        submenu: [
          {
            label: '下载iOS资源',
            accelerator: 'CmdOrCtrl+I',
            click: () => this.startDownload('ios')
          },
          {
            label: '下载Android资源',
            accelerator: 'CmdOrCtrl+A',
            click: () => this.startDownload('android')
          },
          { type: 'separator' },
          {
            label: '停止下载',
            accelerator: 'CmdOrCtrl+S',
            click: () => this.stopDownload(),
            enabled: false,
            id: 'stopDownload'
          }
        ]
      },
      {
        label: '帮助',
        submenu: [
          {
            label: '关于',
            click: () => this.showAbout()
          },
          {
            label: 'GitHub',
            click: () => shell.openExternal('https://github.com/ji233-Sun/PvZ3Downloader')
          }
        ]
      }
    ];

    if (process.platform === 'darwin') {
      // macOS 菜单调整
      template.unshift({
        label: app.getName(),
        submenu: [
          { role: 'about', label: '关于 ' + app.getName() },
          { type: 'separator' },
          { role: 'services', label: '服务' },
          { type: 'separator' },
          { role: 'hide', label: '隐藏 ' + app.getName() },
          { role: 'hideothers', label: '隐藏其他' },
          { role: 'unhide', label: '显示全部' },
          { type: 'separator' },
          { role: 'quit', label: '退出 ' + app.getName() }
        ]
      });
    }

    const { Menu } = require('electron');
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  getIconPath() {
    const iconName = process.platform === 'win32' ? 'icon.ico' : 
                     process.platform === 'darwin' ? 'icon.icns' : 'icon.png';
    const iconPath = path.join(__dirname, '../assets', iconName);
    
    // 检查图标文件是否存在，如果不存在则返回 undefined
    try {
      require('fs').accessSync(iconPath);
      return iconPath;
    } catch (error) {
      return undefined; // Electron 会使用默认图标
    }
  }

  async selectDownloadDirectory() {
    const result = await dialog.showOpenDialog(this.mainWindow, {
      properties: ['openDirectory'],
      title: '选择下载目录',
      defaultPath: this.userConfig.lastDownloadPath || path.join(require('os').homedir(), 'Downloads')
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const selectedPath = result.filePaths[0];
      
      // 更新用户配置
      this.userConfig.lastDownloadPath = selectedPath;
      this.saveUserConfig();
      
      this.mainWindow.webContents.send('directory-selected', selectedPath);
      return selectedPath;
    }
    return null;
  }

  async startDownload(platform, outputDir = null, concurrent = 10, createSubFolder = true) {
    if (this.downloadState.isDownloading) {
      return { success: false, error: '已有下载任务在进行中' };
    }

    if (!this.SUPPORTED_PLATFORMS.includes(platform)) {
      return { success: false, error: `不支持的平台: ${platform}` };
    }

    try {
      this.downloadState.isDownloading = true;
      this.downloadState.currentPlatform = platform;
      this.downloadState.progress = { total: 0, completed: 0, failed: 0 };

      // 设置下载目录逻辑
      if (!outputDir) {
        outputDir = this.userConfig.lastDownloadPath || path.join(require('os').homedir(), 'Downloads');
      }
      
      // 根据用户选择决定是否创建子文件夹
      if (createSubFolder) {
        outputDir = path.join(outputDir, 'pvz3_downloads');
      }
      
      // 添加平台子目录
      outputDir = path.join(outputDir, platform);

      // 保存用户配置
      const baseDir = createSubFolder ? path.dirname(path.dirname(outputDir)) : path.dirname(outputDir);
      this.userConfig.lastDownloadPath = baseDir;
      this.userConfig.lastPlatform = platform;
      this.userConfig.lastConcurrent = concurrent;
      this.userConfig.createSubFolder = createSubFolder;
      this.saveUserConfig();

      // 确保下载目录存在
      await fs.ensureDir(outputDir);

      // 更新菜单状态
      this.updateMenuState(true);

      // 通知前端开始下载
      this.mainWindow.webContents.send('download-started', {
        platform,
        outputDir,
        concurrent
      });

      // 开始下载流程
      const result = await this.performDownload(platform, outputDir, concurrent);

      this.downloadState.isDownloading = false;
      this.updateMenuState(false);

      return result;

    } catch (error) {
      log.error('下载过程中发生严重错误:', error);
      this.downloadState.isDownloading = false;
      this.updateMenuState(false);
      
      // 发送更详细的错误信息
      const errorMessage = error.message || '未知错误';
      this.sendLog(`下载过程发生错误: ${errorMessage}`, 'error');
      
      this.mainWindow.webContents.send('download-error', {
        error: errorMessage
      });

      return { success: false, error: errorMessage };
    }
  }

  async performDownload(platform, outputDir, concurrent) {
    const axios = require('axios');
    
    try {
      // 1. 获取catalog.json
      const catalogUrl = `${this.BASE_CDN_URL}/${platform}/catalog.json`;
      this.sendLog(`正在获取catalog.json: ${catalogUrl}`, 'info');
      
      const catalogResponse = await axios.get(catalogUrl, { timeout: 30000 });
      const catalogData = catalogResponse.data;

      // 保存catalog.json到本地
      const catalogPath = path.join(outputDir, 'catalog.json');
      await fs.writeJSON(catalogPath, catalogData, { spaces: 2 });
      this.sendLog('catalog.json已保存到本地', 'info');

      // 2. 解析内部资源ID
      const internalIds = catalogData.m_InternalIds || [];
      if (internalIds.length === 0) {
        throw new Error('catalog.json中未找到资源ID');
      }

      this.sendLog(`找到 ${internalIds.length} 个资源ID，开始筛选包含CDN占位符的资源...`, 'info');

      // 3. 构建下载列表（先筛选再设置总数）
      const downloadItems = this.buildDownloadList(internalIds, outputDir);
      this.sendLog(`筛选完成：从 ${internalIds.length} 个资源中筛选出 ${downloadItems.length} 个可下载资源`, 'info');
      
      // 设置正确的总数（筛选后的数量）
      this.downloadState.progress.total = downloadItems.length;

      // 4. 执行并发下载
      this.sendLog('开始并发下载资源文件...', 'info');
      const results = await this.downloadAllAssets(downloadItems, concurrent);

      // 检查是否被用户停止
      if (!this.downloadState.isDownloading) {
        this.sendLog('下载已被用户停止', 'info');
        this.mainWindow.webContents.send('download-stopped');
        return { success: false, stopped: true };
      }

      // 5. 统计结果
      const successCount = results.filter(r => r === true).length;
      const failedCount = results.filter(r => r === false).length;
      const stoppedCount = results.filter(r => r === 'stopped').length;

      const stats = {
        total: downloadItems.length,
        success: successCount,
        failed: failedCount,
        stopped: stoppedCount
      };

      const completionRate = ((successCount / downloadItems.length) * 100).toFixed(1);
      this.sendLog(`下载完成 - 总数:${stats.total}, 成功:${stats.success} (${completionRate}%), 失败:${stats.failed}, 停止:${stats.stopped}`, 'info');
      
      this.mainWindow.webContents.send('download-completed', stats);

      return { success: stats.failed === 0 && stats.stopped === 0, stats };

    } catch (error) {
      this.sendLog(`下载失败: ${error.message}`, 'error');
      throw error;
    }
  }

  buildDownloadList(internalIds, outputDir) {
    const placeholders = [
      '{AppSettingsJson.AddressablesCdnServerBaseUrl}',
      '{UnityEngine.AddressableAssets.Addressables.RuntimePath}'
    ];
    const downloadItems = [];

    this.sendLog('开始筛选包含占位符的资源...', 'info');

    for (const internalId of internalIds) {
      // 只处理包含任一占位符的内部ID
      const containsPlaceholder = placeholders.some(placeholder => 
        typeof internalId === 'string' && internalId.includes(placeholder)
      );
      
      if (containsPlaceholder) {
        // 替换所有占位符为实际的BaseUrl
        let downloadUrl = internalId;
        for (const placeholder of placeholders) {
          downloadUrl = downloadUrl.replace(placeholder, this.BASE_CDN_URL);
        }
        
        try {
          // 提取文件名
          const urlObj = new URL(downloadUrl);
          let filename = path.basename(urlObj.pathname);
          
          // 如果没有文件名，生成一个
          if (!filename || filename === '/') {
            const hash = Math.abs(internalId.split('').reduce((a, b) => {
              a = ((a << 5) - a) + b.charCodeAt(0);
              return a & a;
            }, 0));
            filename = `asset_${hash}.bin`;
          }

          downloadItems.push({
            originalPath: internalId,
            downloadUrl: downloadUrl,
            filename: filename,
            localPath: path.join(outputDir, filename)
          });
        } catch (error) {
          this.sendLog(`解析URL失败: ${internalId} - ${error.message}`, 'error');
        }
      }
    }

    this.sendLog(`筛选完成，找到 ${downloadItems.length} 个可下载资源`, 'info');
    return downloadItems;
  }

  async downloadAllAssets(downloadItems, concurrent) {
    const axios = require('axios');
    const results = [];
    const semaphore = new Semaphore(concurrent);

    // 创建下载任务
    const downloadTasks = downloadItems.map((item) => 
      semaphore.acquire().then(async (release) => {
        try {
          // 检查是否应该停止下载
          if (!this.downloadState.isDownloading) {
            release();
            return 'stopped';
          }

          const result = await this.downloadSingleFile(axios, item);
          release();
          return result;
        } catch (error) {
          release();
          return false;
        }
      })
    );

    // 等待所有下载完成或被中断
    const taskResults = await Promise.allSettled(downloadTasks);
    
    // 统计结果
    for (const result of taskResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push(false);
      }
    }

    return results;
  }

  async downloadSingleFile(axios, item) {
    const maxRetries = this.config.maxRetries;
    let retryCount = 0;
    
    while (retryCount <= maxRetries) {
      try {
        // 再次检查是否应该停止下载
        if (!this.downloadState.isDownloading) {
          return 'stopped';
        }

        // 检查文件是否已存在
        if (await fs.pathExists(item.localPath)) {
          const stats = await fs.stat(item.localPath);
          if (stats.size > 0) {
            this.updateProgress(item.filename, true);
            return true; // 跳过已存在的文件
          }
        }

        // 确保目录存在
        await fs.ensureDir(path.dirname(item.localPath));

        // 创建取消标记
        const CancelToken = axios.CancelToken;
        const source = CancelToken.source();

        // 如果下载被停止，取消当前请求
        const checkCancellation = setInterval(() => {
          if (!this.downloadState.isDownloading) {
            source.cancel('Download stopped by user');
            clearInterval(checkCancellation);
          }
        }, 100);

        // 下载文件
        const response = await axios.get(item.downloadUrl, {
          responseType: 'stream',
          timeout: this.config.timeout,
          cancelToken: source.token
        });

        clearInterval(checkCancellation);

        if (response.status === 200) {
          const writer = fs.createWriteStream(item.localPath);
          response.data.pipe(writer);

          await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
            
            // 监听取消信号
            source.token.promise.catch((error) => {
              writer.destroy();
              reject(error);
            });
          });

          // 最后检查是否被停止
          if (!this.downloadState.isDownloading) {
            // 删除部分下载的文件
            try {
              await fs.unlink(item.localPath);
            } catch (e) {
              // 忽略删除错误
            }
            return 'stopped';
          }

          this.updateProgress(item.filename, true);
          return true;
        } else {
          throw new Error(`HTTP ${response.status}`);
        }

      } catch (error) {
        if (axios.isCancel(error)) {
          this.sendLog(`下载被取消: ${item.filename}`, 'info');
          return 'stopped';
        }

        retryCount++;
        
        if (retryCount <= maxRetries) {
          const delay = Math.min(
            this.config.retryDelay * Math.pow(2, retryCount - 1), 
            this.config.maxRetryDelay
          ); // 指数退避
          
          this.sendLog(`下载 ${item.filename} 失败 (第${retryCount}/${maxRetries}次重试): ${error.message}，${delay/1000}秒后重试`, 'info');
          
          // 等待重试延迟
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // 检查在等待期间是否被停止
          if (!this.downloadState.isDownloading) {
            return 'stopped';
          }
        } else {
          this.sendLog(`下载 ${item.filename} 最终失败，已重试${maxRetries}次: ${error.message}`, 'error');
          this.updateProgress(item.filename, false);
          return false;
        }
      }
    }
    
    // 这里应该不会到达，但为了安全起见
    this.updateProgress(item.filename, false);
    return false;
  }

  updateProgress(filename, success) {
    if (success) {
      this.downloadState.progress.completed++;
    } else {
      this.downloadState.progress.failed++;
    }

    // 发送进度更新到前端
    this.mainWindow.webContents.send('progress-update', {
      ...this.downloadState.progress,
      currentFile: filename
    });
  }

  sendLog(message, level = 'info') {
    log.info(message);
    this.mainWindow.webContents.send('log-message', { message, level });
  }

  stopDownload() {
    if (this.downloadState.isDownloading) {
      this.downloadState.isDownloading = false;
      this.updateMenuState(false);
      this.sendLog('用户停止了下载', 'info');
      this.mainWindow.webContents.send('download-stopped');
    }
  }

  updateMenuState(isDownloading) {
    const menu = require('electron').Menu.getApplicationMenu();
    if (menu) {
      const stopMenuItem = menu.getMenuItemById('stopDownload');
      if (stopMenuItem) {
        stopMenuItem.enabled = isDownloading;
      }
    }
  }

  showAbout() {
    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: '关于 PvZ3中国版资源下载器',
      message: 'PvZ3中国版资源下载器',
      detail: `版本: ${app.getVersion()}\n\nPlants vs. Zombies 3 中国版游戏资源批量下载工具\n\n© 2024 ji233-Sun`,
      buttons: ['确定']
    });
  }

  setupIpcHandlers() {
    // 处理来自渲染进程的IPC消息
    ipcMain.handle('start-download', async (event, config) => {
      const { platform, outputDir, concurrent, createSubFolder } = config;
      return await this.startDownload(platform, outputDir, concurrent, createSubFolder);
    });

    ipcMain.handle('stop-download', async () => {
      this.stopDownload();
      return { success: true };
    });

    ipcMain.handle('select-directory', async () => {
      return await this.selectDownloadDirectory();
    });

    ipcMain.handle('get-app-version', async () => {
      return app.getVersion();
    });

    ipcMain.handle('get-download-config', async () => {
      return this.config;
    });

    ipcMain.handle('get-user-config', async () => {
      return this.userConfig;
    });

    ipcMain.handle('save-user-config', async (event, config) => {
      this.userConfig = { ...this.userConfig, ...config };
      this.saveUserConfig();
      return { success: true };
    });
  }
}

// 信号量实现，用于控制并发下载
class Semaphore {
  constructor(count) {
    this.count = count;
    this.waiting = [];
  }

  acquire() {
    return new Promise((resolve) => {
      if (this.count > 0) {
        this.count--;
        resolve(() => this.release());
      } else {
        this.waiting.push(() => {
          this.count--;
          resolve(() => this.release());
        });
      }
    });
  }

  release() {
    this.count++;
    if (this.waiting.length > 0) {
      const next = this.waiting.shift();
      next();
    }
  }
}

// 应用程序实例
const downloader = new PvZ3ResourceDownloader();

// 应用程序事件处理
app.whenReady().then(() => {
  downloader.createWindow();
  downloader.setupIpcHandlers();

  // 在 macOS 上，当点击 dock 图标且没有其他窗口打开时，重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      downloader.createWindow();
    }
  });

  // 检查更新
  autoUpdater.checkForUpdatesAndNotify();
});

// 当所有窗口关闭时退出应用程序
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 防止多个实例
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // 当用户试图运行第二个实例时，聚焦到主窗口
    if (downloader.mainWindow) {
      if (downloader.mainWindow.isMinimized()) {
        downloader.mainWindow.restore();
      }
      downloader.mainWindow.focus();
    }
  });
}

// 导出以供测试使用
module.exports = { PvZ3ResourceDownloader };