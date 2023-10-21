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
import { execFile } from 'child_process';
import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
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

const DICOM_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'backend/dicom_deidentifier.py')
  : path.join(__dirname, '../../backend/dicom_deidentifier.py');

ipcMain.on('ipc-dicom', async (event) => {
  const result = await selectFolder();
  const directory = fs.existsSync(DICOM_PATH);

  event.reply('ipc-dicom-reply', `directory check : ${directory} + ${result}`);
});

async function runPython(dicomPath: string) {
  // Flask 서버로 전송
  const url =
    'https://port-0-dicom-electron-app-euegqv2blnodu475.sel5.cloudtype.app';
  const formData = new FormData();
  formData.append('folder', fs.createReadStream(dicomPath));

  axios
    .post(url, formData, {
      headers: formData.getHeaders(),
    })
    .then((res) => {
      console.log(`폴더 업로드 응답: ${res.data}`);
    })
    .catch((error) => {
      console.error(`폴더 업로드 오류: ${error}`);
      throw error;
    });
}

ipcMain.on('ipc-form', (event) => {
  runPython(folderPath)
    .then(() => {
      event.reply('ipc-form-reply', `success`);
    })
    .catch((err: any) => {
      event.reply('ipc-form-reply', `error: ${JSON.stringify(err)}`);
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

// Flask 서버 path
const SERVER_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'backend/api')
  : path.join(__dirname, '../../backend/api');

let pythonProcess: any; // Python 프로세스를 저장하는 변수

function startFlaskServer() {
  if (!pythonProcess) {
    pythonProcess = execFile(path.resolve(SERVER_PATH), ['src']);
    // Flask 서버 출력을 로깅
    pythonProcess.stdout.on('data', (data: any) => {
      console.log(`flask stdout: ${data}`);
    });

    pythonProcess.stderr.on('data', (data: any) => {
      console.error(`flask stderr: ${data}`);
    });
  }
}

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

    startFlaskServer();

    mainWindow?.on('closed', () => {
      if (pythonProcess) {
        pythonProcess.kill();
        pythonProcess = null;
      }
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
