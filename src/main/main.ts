/* eslint-disable prefer-promise-reject-errors */
/* eslint global-require: off, no-console: off, promise/always-return: off */
/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log'; // node-pty 를 추가
import path from 'path';
import { PythonShell } from 'python-shell';
import os from 'os';
import fs from 'fs';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: any;

let folderPath: string = '';

async function selectFolder() {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    // eslint-disable-next-line prefer-destructuring
    folderPath = result.filePaths[0];
  }

  return folderPath;
}

// 사용자의 dicom 폴더에 대한 권한을 확인하고, 필요하다면 권한을 부여하는 함수
async function checkDicomFolderPermission(dicomFolderPath: string) {
  try {
    // 폴더의 권한 확인
    const stats = await fs.promises.stat(dicomFolderPath);
    const hasPermission =
      // eslint-disable-next-line no-bitwise
      stats.mode & fs.constants.R_OK && stats.mode & fs.constants.W_OK;

    if (!hasPermission) {
      // 권한이 없다면 사용자에게 권한을 요청
      const { response } = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        buttons: ['Yes', 'No'],
        defaultId: 0,
        title: 'Permission Request',
        message:
          'This app needs access to your dicom folder. Do you want to grant access?',
      });

      if (response === 0) {
        // 사용자가 'Yes'를 클릭하면 권한 부여
        await fs.promises.chmod(dicomFolderPath, '755');
        console.log('Permissions granted successfully');
      }
    }
  } catch (err) {
    console.error('Error checking or setting permissions:', err);
  }
}

const DICOM_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'backend/dicom_deidentifier.py')
  : path.join(__dirname, '../../backend/dicom_deidentifier.py');

function getPythonPath(platform: any) {
  let pythonDir = '';
  let pythonExecutable = '';

  switch (platform) {
    case 'win32':
      pythonDir = 'windows';
      pythonExecutable = 'pythonw.exe';
      break;
    case 'darwin':
      pythonDir = 'mac';
      pythonExecutable = 'python3.12';
      break;
    case 'linux':
      pythonDir = 'linux';
      pythonExecutable = 'python';
      break;
    default:
      throw new Error('Unsupported OS');
  }

  if (app.isPackaged) {
    return path.join(
      process.resourcesPath,
      'backend/python',
      pythonDir,
      pythonExecutable
    );
  }
  return path.join(
    __dirname,
    '../../backend/python',
    pythonDir,
    pythonExecutable
  );
}

ipcMain.on('ipc-dicom', async (event) => {
  const result = await selectFolder();
  const pythonPath = getPythonPath(os.platform());
  event.reply(
    'ipc-dicom-reply',
    `pythonPath : ${pythonPath}, DICOMPath : ${DICOM_PATH},${result}`
  );
});

ipcMain.on('ipc-form', async (event) => {
  await checkDicomFolderPermission(folderPath);

  const pythonPath = getPythonPath(os.platform());

  const options = {
    pythonPath,
    args: [folderPath],
    mode: 'text' as const,
  };

  const pythonShell = new PythonShell(DICOM_PATH, options);

  pythonShell.on('message', (message) => {
    // Python 스크립트에서 print()를 호출할 때마다 여기가 실행됩니다.
    console.log('Python Output:', message);
    // Electron 렌더러 프로세스로 메시지 전송
    event.reply('ipc-form-reply', { code: 'none', message });
  });

  pythonShell.end((err, code, signal) => {
    if (err) {
      console.error('PythonShell Error:', err, code);
      event.reply('ipc-form-reply', { code, message: JSON.stringify(err) });
    } else {
      console.log('PythonShell Finished:', { code, signal });
      event.reply('ipc-form-reply', {
        code,
        message: 'Complete Dicom Deidentification (check your directory)',
      });
    }
  });
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }
  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }

    mainWindow?.on('closed', () => {
      mainWindow = null;
    });
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata: any) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
    // Electron 애플리케이션 종료 시 Flask 서버도 종료
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
