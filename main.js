const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let currentFilePath = null;
let isModified = false;

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
                        checkUnsavedChanges(() => {
                            currentFilePath = null;
                            isModified = false;
                            mainWindow.webContents.send('document:new');
                            updateTitle();
                        });
                    }
                },
                {
                    label: '打开',
                    accelerator: 'Ctrl+O',
                    click: () => {
                        checkUnsavedChanges(() => {
                            openFile();
                        });
                    }
                },
                {
                    label: '保存',
                    accelerator: 'Ctrl+S',
                    click: () => {
                        saveFile();
                    }
                },
                {
                    label: '另存为',
                    accelerator: 'Ctrl+Shift+S',
                    click: () => {
                        saveFileAs();
                    }
                },
                { type: 'separator' },
                {
                    label: '插入图片',
                    accelerator: 'Ctrl+I',
                    click: () => {
                        insertImage();
                    }
                },
                { type: 'separator' },
                {
                    label: '退出',
                    accelerator: 'Ctrl+Q',
                    click: () => {
                        checkUnsavedChanges(() => {
                            app.quit();
                        });
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
                { label: '强制重新加载', accelerator: 'Ctrl+Shift+R', role: 'forceReload' },
                { label: '切换开发者工具', accelerator: 'F12', role: 'toggleDevTools' },
                { type: 'separator' },
                { label: '实际大小', accelerator: 'Ctrl+0', role: 'resetZoom' },
                { label: '放大', accelerator: 'Ctrl+Plus', role: 'zoomIn' },
                { label: '缩小', accelerator: 'Ctrl+-', role: 'zoomOut' },
                { type: 'separator' },
                { label: '全屏', accelerator: 'F11', role: 'togglefullscreen' }
            ]
        },
        {
            label: '帮助',
            submenu: [
                {
                    label: '关于',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: '关于文档编辑器',
                            message: '文档编辑器 v1.0.0',
                            detail: '基于 Electron 开发的桌面文档编辑器\n支持查看、编辑、保存 txt 文档\n支持插入图片'
                        });
                    }
                }
            ]
        }
    ]);

    Menu.setApplicationMenu(menu);

    mainWindow.on('close', (e) => {
        if (isModified) {
            e.preventDefault();
            checkUnsavedChanges(() => {
                mainWindow.destroy();
            });
        }
    });
}

function updateTitle() {
    let title = '文档编辑器';
    if (currentFilePath) {
        title = path.basename(currentFilePath) + ' - ' + title;
    }
    if (isModified) {
        title = '*' + title;
    }
    mainWindow.setTitle(title);
}

function checkUnsavedChanges(callback) {
    if (isModified) {
        const result = dialog.showMessageBoxSync(mainWindow, {
            type: 'question',
            buttons: ['保存', '不保存', '取消'],
            defaultId: 0,
            cancelId: 2,
            title: '确认',
            message: '文档已被修改，是否保存更改？'
        });

        if (result === 0) {
            if (currentFilePath) {
                mainWindow.webContents.send('document:getContent');
            } else {
                saveFileAs();
            }
        } else if (result === 1) {
            callback();
        }
    } else {
        callback();
    }
}

function openFile() {
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
            isModified = false;
            mainWindow.webContents.send('document:open', content, files[0]);
            updateTitle();
        } catch (error) {
            dialog.showErrorBox('错误', '无法打开文件: ' + error.message);
        }
    }
}

function saveFile() {
    if (currentFilePath) {
        mainWindow.webContents.send('document:getContent');
    } else {
        saveFileAs();
    }
}

function saveFileAs() {
    const file = dialog.showSaveDialogSync(mainWindow, {
        filters: [
            { name: '文本文档', extensions: ['txt'] },
            { name: '所有文件', extensions: ['*'] }
        ]
    });

    if (file) {
        currentFilePath = file;
        mainWindow.webContents.send('document:getContent');
    }
}

function insertImage() {
    const files = dialog.showOpenDialogSync(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: '图片文件', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'] }
        ]
    });

    if (files && files.length > 0) {
        mainWindow.webContents.send('image:insert', files[0]);
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

ipcMain.on('document:content', (event, content, images) => {
    if (currentFilePath) {
        try {
            let textContent = content;
            if (images && images.length > 0) {
                textContent += '\n\n--- 插入的图片 ---\n';
                images.forEach((img, index) => {
                    textContent += `[图片${index + 1}]: ${img.path}\n`;
                });
            }
            fs.writeFileSync(currentFilePath, textContent, 'utf-8');
            isModified = false;
            updateTitle();
        } catch (error) {
            dialog.showErrorBox('错误', '无法保存文件: ' + error.message);
        }
    }
});

ipcMain.on('document:modified', () => {
    isModified = true;
    updateTitle();
});
