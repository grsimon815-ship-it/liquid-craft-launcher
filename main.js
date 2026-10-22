const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const MinecraftEngine = require('./minecraft-engine');

let mainWindow = null;
const engine = new MinecraftEngine(path.join(__dirname, 'data', 'minecraft'));

// Start local launcher API server
require('./server.js');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1260,
    height: 800,
    minWidth: 1000,
    minHeight: 650,
    frame: false, // Liquid glass custom frameless titlebar
    transparent: false,
    backgroundColor: '#03050a',
    title: 'Liquid Craft Launcher',
    icon: path.join(__dirname, 'public', 'favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load via local server to guarantee all Modrinth & BMCLAPI proxy APIs work seamlessly
  mainWindow.loadURL('http://localhost:3918');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Window Controls
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on('open-folder', (event, folder) => {
  const target = folder || path.join(__dirname, 'data', 'minecraft');
  shell.openPath(target);
});

// IPC: Real Minecraft Download via BMCLAPI
ipcMain.handle('minecraft-install', async (event, versionId) => {
  try {
    const result = await engine.installVersion(versionId, (progressData) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('minecraft-install-progress', progressData);
      }
    });
    return { success: true, result };
  } catch (err) {
    console.error('Error in minecraft-install:', err);
    return { success: false, error: err.message };
  }
});

// IPC: Real Minecraft Launch (with automatic download if not installed!)
ipcMain.handle('minecraft-launch', async (event, options) => {
  try {
    const versionId = options.versionId || '1.20.1';
    const verDir = path.join(engine.versionsDir, versionId);
    const clientJar = path.join(verDir, `${versionId}.jar`);

    // If version is not downloaded yet, automatically download it now!
    if (!fs.existsSync(clientJar)) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('minecraft-launch-log', `[LAUNCHER] Версия ${versionId} ещё не загружена. Начинаем автоматическое скачивание с зеркала...`);
      }

      await engine.installVersion(versionId, (progressData) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('minecraft-launch-log', `[СКАЧИВАНИЕ ${progressData.percent}%] ${progressData.status}: ${progressData.details}`);
        }
      });

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('minecraft-launch-log', `[LAUNCHER] Версия ${versionId} успешно загружена с зеркала! Подготовка запуска...`);
      }
    }

    const proc = await engine.launch({
      versionId: versionId,
      username: options.username || 'LiquidPlayer',
      memoryMin: options.memoryMin || 2,
      memoryMax: options.memoryMax || 4,
      onLog: (logLine) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('minecraft-launch-log', logLine);
        }
      },
      onExit: (code) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('minecraft-launch-log', `[LAUNCHER] Игра завершилась с кодом ${code}`);
        }
      }
    });

    return { success: true, pid: proc.pid };
  } catch (err) {
    console.error('Error in minecraft-launch:', err);
    return { success: false, error: err.message };
  }
});

// IPC: Get installed versions
ipcMain.handle('get-installed-versions', () => {
  const versionsDir = engine.versionsDir;
  if (!fs.existsSync(versionsDir)) return [];
  return fs.readdirSync(versionsDir).filter(f => {
    return fs.statSync(path.join(versionsDir, f)).isDirectory() &&
           fs.existsSync(path.join(versionsDir, f, `${f}.jar`));
  });
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
