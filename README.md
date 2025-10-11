# PvZ3中国版资源下载器

Plants vs. Zombies 3 中国版游戏资源批量下载工具

## 功能特性

- 🌻 支持 iOS 和 Android 平台资源下载
- 🚀 多线程并发下载，提高下载效率
- 📊 实时显示下载进度和统计信息
- 📝 详细的下载日志记录
- 🎯 用户友好的图形界面
- 📁 智能路径选择和配置持久化
- ⚙️ 自动重试机制，提高下载成功率
- ⏹️ 支持下载任务暂停和恢复
- 💾 记忆用户设置，下次启动自动填充
- 🌐 **新功能**: 自定义下载模式，支持国际版等其他游戏版本

## 安装与运行

### 开发环境

1. 确保已安装 Node.js (>=16.0.0)
2. 克隆项目并安装依赖：

```bash
# 使用 npm
npm install

# 或使用 yarn
yarn install
```

3. 启动应用：

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

### 构建发布版本

```bash
# 构建当前平台版本
npm run build

# 构建 Windows 版本
npm run build:win

# 构建 macOS 版本
npm run build:mac

# 构建 Linux 版本
npm run build:linux

# 构建所有平台版本
npm run build:all
```

## 使用说明

### 标准模式（中国版）

1. 启动应用程序
2. 下载模式选择"标准模式（中国版）"
3. 选择要下载的平台（iOS 或 Android）
4. 点击"选择目录"按钮选择下载路径（应用会记住您的选择）
5. 可选择是否在选定目录下自动创建 "pvz3_downloads" 文件夹
6. 调整并发下载数（建议 1-20 之间）
7. 点击"开始下载"按钮开始下载资源
8. 可随时点击"停止下载"按钮暂停下载

### 自定义模式（国际版等）

自定义模式允许您下载 PvZ3 国际版或其他游戏版本的资源。

1. 启动应用程序
2. 下载模式选择"自定义模式"
3. **配置 Catalog 来源**：
   - **上传本地文件**：点击"选择 catalog.json"按钮，选择本地的 catalog.json 文件
   - **使用 URL**：输入 catalog.json 文件的完整 URL
4. **输入资源基础 URL**：输入游戏资源 CDN 的根 URL（不包含平台目录）
   - 例如：`https://pvz3cdn.example.com/intl_prod/client-assets`
5. 选择平台、下载目录等其他设置
6. 点击"开始下载"

**详细使用指南请参阅**: [CUSTOM_DOWNLOAD_USAGE.md](CUSTOM_DOWNLOAD_USAGE.md)

### 目录结构

根据您的设置，文件将下载到以下位置：

**开启子文件夹创建（默认）：**
```
选择的目录/
└── pvz3_downloads/
    ├── iOS/
    │   ├── catalog.json
    │   └── 资源文件...
    └── Android/
        ├── catalog.json
        └── 资源文件...
```

**关闭子文件夹创建：**
```
选择的目录/
├── iOS/
│   ├── catalog.json
│   └── 资源文件...
└── Android/
    ├── catalog.json
    └── 资源文件...
```

### 配置文件

应用会在用户主目录下创建 `.pvz3-downloader-config.json` 文件来保存：
- 上次使用的下载路径
- 上次选择的平台
- 上次设置的并发数
- 子文件夹创建偏好
- 下载模式（标准/自定义）
- 自定义模式配置（catalog 来源、URL、基础 URL）

这样下次启动时会自动填充这些设置。

## 技术架构

- **前端**: HTML5 + CSS3 + Vanilla JavaScript
- **后端**: Electron + Node.js
- **下载引擎**: Axios + 信号量并发控制
- **文件操作**: fs-extra
- **日志系统**: electron-log
- **自动更新**: electron-updater

## 项目结构

```
PvZ3Downloader/
├── gui/                 # 前端界面文件
│   └── index.html      # 主界面
├── src/                # 主要源代码
│   ├── main.js         # Electron 主进程
│   └── preload.js      # 预加载脚本
├── assets/             # 资源文件（图标等）
├── package.json        # 项目配置
└── README.md          # 说明文档
```

## 开发说明

### 主要组件

1. **PvZ3ResourceDownloader**: 主应用类，负责窗口管理和下载逻辑
2. **Semaphore**: 信号量类，用于控制并发下载数量
3. **前端界面**: 响应式设计，支持实时进度显示

### IPC 通信

- `start-download`: 开始下载任务（支持自定义配置）
- `stop-download`: 停止下载任务
- `select-directory`: 选择下载目录
- `select-catalog-file`: 选择 catalog.json 文件
- `get-app-version`: 获取应用版本
- `get-user-config`: 获取用户配置
- `save-user-config`: 保存用户配置

### 事件系统

- `download-started`: 下载开始
- `download-completed`: 下载完成
- `download-stopped`: 下载停止
- `progress-update`: 进度更新
- `log-message`: 日志消息

## 许可证

MIT License - 详见 LICENSE 文件

## 贡献

欢迎提交 Issue 和 Pull Request！

## 联系方式

- GitHub: [ji233-Sun](https://github.com/ji233-Sun)
- 项目地址: [PvZ3Downloader](https://github.com/ji233-Sun/PvZ3Downloader)