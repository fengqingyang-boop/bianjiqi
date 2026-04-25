const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');

contextBridge.exposeInMainWorld('electronAPI', {
    onDocumentNew: (callback) => {
        ipcRenderer.on('document:new', callback);
    },
    onDocumentOpen: (callback) => {
        ipcRenderer.on('document:open', (event, content, filePath) => {
            callback(content, filePath);
        });
    },
    onGetContent: (callback) => {
        ipcRenderer.on('document:getContent', (event, action) => {
            callback(action);
        });
    },
    onInsertImage: (callback) => {
        ipcRenderer.on('image:insert', (event, imagePath) => {
            callback(imagePath);
        });
    },
    sendContent: (content, images) => {
        ipcRenderer.send('document:content', content, images);
    },
    notifyModified: () => {
        ipcRenderer.send('document:modified');
    },
    getFileName: (filePath) => {
        return path.basename(filePath);
    },
    dialogOpenFile: async () => {
        return await ipcRenderer.invoke('dialog:openFile');
    },
    dialogSaveFile: async (content, images) => {
        return await ipcRenderer.invoke('dialog:saveFile', content, images);
    },
    dialogSaveAsFile: async (content, images) => {
        return await ipcRenderer.invoke('dialog:saveAsFile', content, images);
    },
    dialogInsertImage: async () => {
        return await ipcRenderer.invoke('dialog:insertImage');
    },
    newDocument: async () => {
        return await ipcRenderer.invoke('document:new');
    },
    getCurrentFilePath: async () => {
        return await ipcRenderer.invoke('get:currentFilePath');
    },
    removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    }
});
