const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const express = require('express');
const Gun = require('gun');
const qr = require('qrcode-terminal');
const ip = require('ip');
require('dotenv').config();
const setSelfAdjustingInterval = require('self-adjusting-interval');

const isDev = process.env.NODE_ENV === 'development';
const configPath = path.join(app.getPath('userData'), 'config.json');

async function loadConfig() {
  try {
    const data = await fs.readFile(configPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { storeEnabled: process.env.RELAY_STORE !== 'false' };
  }
}

async function saveConfig(config) {
  try {
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
    console.log('Config saved:', config);
  } catch (err) {
    console.error('Failed to save config:', err);
  }
}

const relayServer = {
  initiated: false,
  win: null,
  db: null,
  gun: null,
  async init({
    host = process.env.RELAY_HOST || ip.address(),
    store = null,
    port = process.env.RELAY_PORT || 4200,
    path = process.env.RELAY_PATH || 'public',
    showQr = process.env.RELAY_QR || false,
  } = {}) {
    if (this.initiated) {
      return { db: this.db, gun: this.gun, host };
    }
    this.initiated = true;

    const config = await loadConfig();
    const storeEnabled = store !== null ? store : config.storeEnabled;

    const expressApp = express();
    expressApp.use(express.static(path));
    const server = expressApp.listen(port);

    this.gun = Gun({
      super: false,
      file: 'store',
      radisk: storeEnabled,
      web: server,
      multicast: { port: 8765 },
    });

    const link = 'http://' + host + (port ? ':' + port : '');
    let totalConnections = 0;
    let activeWires = 0;

    this.db = this.gun.get(host);

    setSelfAdjustingInterval(() => {
      this.db.get('pulse').put(Date.now());
    }, 500);

    this.gun.on('hi', () => {
      totalConnections += 1;
      activeWires += 1;
      this.db.get('totalConnections').put(totalConnections);
      this.db.get('activeWires').put(activeWires);
      console.log('Peer connected, total:', totalConnections);
      if (this.win) {
        this.win.webContents.send('relay-update', { totalConnections, activeWires });
      }
    });

    this.gun.on('bye', () => {
      activeWires -= 1;
      this.db.get('activeWires').put(activeWires);
      console.log('Peer disconnected, active:', activeWires);
      if (this.win) {
        this.win.webContents.send('relay-update', { totalConnections, activeWires });
      }
    });

    this.db.get('host').put(host);
    this.db.get('port').put(port);
    this.db.get('link').put(link);
    this.db.get('store').put(storeEnabled);
    this.db.get('status').put('running');
    this.db.get('started').put(Date.now());

    console.log('Server started at ' + link + '/#/?relay=' + link + '/gun');
    console.log('Gun peer link is ' + link + '/gun');
    console.log('Data storage is ' + (storeEnabled ? 'enabled' : 'disabled'));

    if (showQr !== false) {
      console.log('----------');
      qr.generate(link);
      console.log('----------');
    }

    return { expressApp, db: this.db, gun: this.gun, host };
  },
};

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 700,
    height: 600,
    frame: false, // 移除默认窗口框架
    transparent: true, // 启用透明窗口
    backgroundColor: '#00000000', // 完全透明背景
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, 'build', process.platform === 'win32' ? 'icon.ico' : process.platform === 'darwin' ? 'icon.icns' : 'icon.png'),

  });

  relayServer.win = mainWindow;
  const { host } = relayServer.init();

  if (isDev) {
    mainWindow
      .loadURL('http://localhost:5173')
      .then(() => console.log('Dev server loaded'))
      .catch((err) => console.error('Failed to load dev server:', err));
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow
      .loadFile(path.join(__dirname, 'dist', 'index.html'))
      .then(() => console.log('Production build loaded'))
      .catch((err) => console.error('Failed to load production build:', err));
  }

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Window finished loading');
    mainWindow.webContents.send('relay-init', {
      host,
      port: 4200,
      link: `http://${host}:4200`,
    });
  });

  return mainWindow;
}

app.whenReady().then(() => {
  const win = createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    relayServer.initiated = false;
    relayServer.win = null;
    relayServer.db = null;
    relayServer.gun = null;
    app.quit();
  }
});

ipcMain.handle('get-relay-info', async (event) => {
  const host = process.env.RELAY_HOST || ip.address();
  console.log('IPC: get-relay-info called');
  return {
    host,
    port: 4200,
    link: `http://${host}:4200`,
  };
});

ipcMain.handle('set-relay-store', async (event, storeEnabled) => {
  console.log('IPC: set-relay-store called with:', storeEnabled);
  if (!relayServer.db) {
    console.error('relayServer.db is not initialized');
    throw new Error('Relay server not initialized');
  }
  relayServer.db.get('store').put(storeEnabled);
  await saveConfig({ storeEnabled });
  return { success: true };
});

// 添加窗口控制 IPC
ipcMain.on('window-minimize', () => {
  relayServer.win.minimize();
});

ipcMain.on('window-maximize', () => {
  if (relayServer.win.isMaximized()) {
    relayServer.win.unmaximize();
  } else {
    relayServer.win.maximize();
  }
});

ipcMain.on('window-close', () => {
  relayServer.win.close();
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});