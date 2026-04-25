const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onMenuNew: (callback) => {
        ipcRenderer.on('menu:new', callback);
    },
    onMenuSave: (callback) => {
        ipcRenderer.on('menu:save', callback);
    },
    onMenuSaveAs: (callback) => {
        ipcRenderer.on('menu:saveAs', callback);
    },
    onFileOpened: (callback) => {
        ipcRenderer.on('file:opened', (event, content, filePath) => {
            callback(content, filePath);
        });
    },
    onImageInserted: (callback) => {
        ipcRenderer.on('image:inserted', (event, imagePath) => {
            callback(imagePath);
        });
    },
    openFile: async () => {
        return await ipcRenderer.invoke('dialog:openFile');
    },
    saveFile: async (content, images, useCurrentPath) => {
        return await ipcRenderer.invoke('dialog:saveFile', content, images, useCurrentPath);
    },
    insertImage: async () => {
        return await ipcRenderer.invoke('dialog:insertImage');
    },
    getFileName: async (filePath) => {
        return await ipcRenderer.invoke('path:basename', filePath);
    },
    getCurrentFilePath: async () => {
        return await ipcRenderer.invoke('get:currentFilePath');
    }
});
