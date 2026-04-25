const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let currentFilePath = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    mainWindow.loadFile('index.html');

    const menu = Menu.buildFromTemplate([
        {
            label: '文件',
            submenu: [
                {
                    label: '新建',
                    accelerator: 'Ctrl+N',
                    click: () => {
                        mainWindow.webContents.send('menu:new');
                    }
                },
                {
                    label: '打开',
                    accelerator: 'Ctrl+O',
                    click: () => {
                        openFileWithDialog();
                    }
                },
                {
                    label: '保存',
                    accelerator: 'Ctrl+S',
                    click: () => {
                        mainWindow.webContents.send('menu:save');
                    }
                },
                {
                    label: '另存为',
                    accelerator: 'Ctrl+Shift+S',
                    click: () => {
                        mainWindow.webContents.send('menu:saveAs');
                    }
                },
                { type: 'separator' },
                {
                    label: '插入图片',
                    accelerator: 'Ctrl+I',
                    click: () => {
                        insertImageWithDialog();
                    }
                },
                { type: 'separator' },
                {
                    label: '退出',
                    accelerator: 'Ctrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: '编辑',
            submenu: [
                { label: '撤销', accelerator: 'Ctrl+Z', role: 'undo' },
                { label: '重做', accelerator: 'Ctrl+Y', role: 'redo' },
                { type: 'separator' },
                { label: '剪切', accelerator: 'Ctrl+X', role: 'cut' },
                { label: '复制', accelerator: 'Ctrl+C', role: 'copy' },
                { label: '粘贴', accelerator: 'Ctrl+V', role: 'paste' },
                { label: '删除', role: 'delete' },
                { type: 'separator' },
                { label: '全选', accelerator: 'Ctrl+A', role: 'selectAll' }
            ]
        },
        {
            label: '查看',
            submenu: [
                { label: '重新加载', accelerator: 'Ctrl+R', role: 'reload' },
                { label: '切换开发者工具', accelerator: 'F12', role: 'toggleDevTools' },
                { type: 'separator' },
                { label: '全屏', accelerator: 'F11', role: 'togglefullscreen' }
            ]
        }
    ]);

    Menu.setApplicationMenu(menu);
}

function openFileWithDialog() {
    const files = dialog.showOpenDialogSync(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: '文本文档', extensions: ['txt'] },
            { name: '所有文件', extensions: ['*'] }
        ]
    });

    if (files && files.length > 0) {
        try {
            const content = fs.readFileSync(files[0], 'utf-8');
            currentFilePath = files[0];
            mainWindow.webContents.send('file:opened', content, files[0]);
            updateWindowTitle(files[0]);
        } catch (error) {
            dialog.showErrorBox('错误', '无法打开文件: ' + error.message);
        }
    }
}

function insertImageWithDialog() {
    const files = dialog.showOpenDialogSync(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: '图片文件', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'] }
        ]
    });

    if (files && files.length > 0) {
        mainWindow.webContents.send('image:inserted', files[0]);
    }
}

function updateWindowTitle(filePath) {
    if (filePath) {
        mainWindow.setTitle(path.basename(filePath) + ' - 文档编辑器');
    } else {
        mainWindow.setTitle('文档编辑器');
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

ipcMain.handle('dialog:openFile', () => {
    const files = dialog.showOpenDialogSync(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: '文本文档', extensions: ['txt'] },
            { name: '所有文件', extensions: ['*'] }
        ]
    });

    if (files && files.length > 0) {
        try {
            const content = fs.readFileSync(files[0], 'utf-8');
            currentFilePath = files[0];
            updateWindowTitle(files[0]);
            return { success: true, content, filePath: files[0] };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    return { success: false, cancelled: true };
});

ipcMain.handle('dialog:saveFile', (event, content, images, useCurrentPath) => {
    let savePath = null;
    
    if (useCurrentPath && currentFilePath) {
        savePath = currentFilePath;
    } else {
        const file = dialog.showSaveDialogSync(mainWindow, {
            filters: [
                { name: '文本文档', extensions: ['txt'] },
                { name: '所有文件', extensions: ['*'] }
            ]
        });
        if (file) {
            savePath = file;
            currentFilePath = file;
        }
    }

    if (savePath) {
        try {
            let textContent = content;
            if (images && images.length > 0) {
                textContent += '\n\n--- 插入的图片 ---\n';
                images.forEach((img, index) => {
                    textContent += `[图片${index + 1}]: ${img.path}\n`;
                });
            }
            fs.writeFileSync(savePath, textContent, 'utf-8');
            updateWindowTitle(savePath);
            return { success: true, filePath: savePath };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    return { success: false, cancelled: true };
});

ipcMain.handle('dialog:insertImage', () => {
    const files = dialog.showOpenDialogSync(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: '图片文件', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'] }
        ]
    });

    if (files && files.length > 0) {
        return { success: true, imagePath: files[0] };
    }
    return { success: false, cancelled: true };
});

ipcMain.handle('path:basename', (event, filePath) => {
    return path.basename(filePath);
});

ipcMain.handle('get:currentFilePath', () => {
    return currentFilePath;
});
