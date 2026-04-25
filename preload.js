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
        ipcRenderer.on('document:getContent', callback);
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
    }
});
