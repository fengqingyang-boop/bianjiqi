const editor = document.getElementById('editor');
const imagesContainer = document.getElementById('images-container');
const statusText = document.getElementById('status-text');

let insertedImages = [];

function updateStatus(text) {
    console.log('Status:', text);
    if (statusText) {
        statusText.textContent = text;
    }
}

function getDocumentContent() {
    return {
        text: editor ? editor.value : '',
        images: insertedImages.map(img => ({
            path: img.path,
            name: img.name
        }))
    };
}

function setDocumentContent(content, filePath) {
    if (editor) {
        editor.value = content || '';
    }
    insertedImages = [];
    renderImages();
    
    if (filePath) {
        updateStatus('已打开: ' + filePath);
    } else {
        updateStatus('新文档');
    }
}

async function addImage(imagePath) {
    console.log('Adding image:', imagePath);
    
    const imageInfo = {
        id: Date.now(),
        path: imagePath,
        name: imagePath.split('\\').pop().split('/').pop()
    };
    
    insertedImages.push(imageInfo);
    renderImages();
    updateStatus('已插入图片: ' + imageInfo.name);
}

function removeImage(id) {
    const index = insertedImages.findIndex(img => img.id === id);
    if (index > -1) {
        const removedImage = insertedImages.splice(index, 1)[0];
        renderImages();
        updateStatus('已移除图片: ' + removedImage.name);
    }
}

function renderImages() {
    console.log('Rendering images, count:', insertedImages.length);
    
    if (!imagesContainer) {
        console.log('imagesContainer not found');
        return;
    }
    
    if (insertedImages.length === 0) {
        imagesContainer.innerHTML = '';
        imagesContainer.classList.remove('has-images');
        return;
    }
    
    imagesContainer.classList.add('has-images');
    imagesContainer.innerHTML = `
        <div class="section-title">已插入的图片 (${insertedImages.length})</div>
    `;
    
    insertedImages.forEach(image => {
        const imageItem = document.createElement('div');
        imageItem.className = 'image-item';
        
        const encodedPath = encodeURI(image.path).replace(/\(/g, '%28').replace(/\)/g, '%29');
        const imageSrc = 'file://' + encodedPath;
        
        console.log('Image source:', imageSrc);
        
        imageItem.innerHTML = `
            <img class="image-preview" src="${imageSrc}" alt="${image.name}" onerror="console.error('Failed to load image:', this.src)">
            <div class="image-info">
                <div class="image-name" title="${image.name}">${image.name}</div>
                <div class="image-path" title="${image.path}">${image.path}</div>
            </div>
            <button class="image-remove" data-id="${image.id}" title="移除">
                <svg viewBox="0 0 24 24" width="16" height="16">
                    <path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                </svg>
            </button>
        `;
        imagesContainer.appendChild(imageItem);
    });
    
    document.querySelectorAll('.image-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.currentTarget.dataset.id);
            removeImage(id);
        });
    });
}

async function handleOpenFile() {
    console.log('handleOpenFile called');
    try {
        const result = await window.electronAPI.openFile();
        console.log('openFile result:', result);
        if (result.success) {
            setDocumentContent(result.content, result.filePath);
        } else if (result.error) {
            updateStatus('打开失败: ' + result.error);
        }
    } catch (error) {
        console.error('handleOpenFile error:', error);
        updateStatus('打开失败: ' + error.message);
    }
}

async function handleSaveFile() {
    console.log('handleSaveFile called');
    try {
        const content = getDocumentContent();
        const result = await window.electronAPI.saveFile(content.text, content.images, true);
        console.log('saveFile result:', result);
        if (result.success) {
            updateStatus('已保存: ' + result.filePath);
        } else if (result.error) {
            updateStatus('保存失败: ' + result.error);
        }
    } catch (error) {
        console.error('handleSaveFile error:', error);
        updateStatus('保存失败: ' + error.message);
    }
}

async function handleSaveAsFile() {
    console.log('handleSaveAsFile called');
    try {
        const content = getDocumentContent();
        const result = await window.electronAPI.saveFile(content.text, content.images, false);
        console.log('saveAsFile result:', result);
        if (result.success) {
            updateStatus('已另存为: ' + result.filePath);
        } else if (result.error) {
            updateStatus('保存失败: ' + result.error);
        }
    } catch (error) {
        console.error('handleSaveAsFile error:', error);
        updateStatus('保存失败: ' + error.message);
    }
}

async function handleInsertImage() {
    console.log('handleInsertImage called');
    try {
        const result = await window.electronAPI.insertImage();
        console.log('insertImage result:', result);
        if (result.success) {
            await addImage(result.imagePath);
        }
    } catch (error) {
        console.error('handleInsertImage error:', error);
        updateStatus('插入图片失败: ' + error.message);
    }
}

function handleNewDocument() {
    console.log('handleNewDocument called');
    setDocumentContent('');
}

function handleCut() {
    console.log('handleCut called');
    if (editor) {
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        if (start !== end) {
            const selectedText = editor.value.substring(start, end);
            navigator.clipboard.writeText(selectedText).then(() => {
                editor.value = editor.value.substring(0, start) + editor.value.substring(end);
                editor.selectionStart = editor.selectionEnd = start;
                updateStatus('已剪切');
            }).catch(err => {
                console.error('Cut error:', err);
            });
        }
    }
}

function handleCopy() {
    console.log('handleCopy called');
    if (editor) {
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        if (start !== end) {
            const selectedText = editor.value.substring(start, end);
            navigator.clipboard.writeText(selectedText).then(() => {
                updateStatus('已复制');
            }).catch(err => {
                console.error('Copy error:', err);
            });
        }
    }
}

function handlePaste() {
    console.log('handlePaste called');
    if (editor) {
        navigator.clipboard.readText().then(text => {
            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            editor.value = editor.value.substring(0, start) + text + editor.value.substring(end);
            editor.selectionStart = editor.selectionEnd = start + text.length;
            updateStatus('已粘贴');
        }).catch(err => {
            console.error('Paste error:', err);
        });
    }
}

function initEventListeners() {
    console.log('Initializing event listeners');
    
    const btnNew = document.getElementById('btn-new');
    const btnOpen = document.getElementById('btn-open');
    const btnSave = document.getElementById('btn-save');
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');
    const btnCut = document.getElementById('btn-cut');
    const btnCopy = document.getElementById('btn-copy');
    const btnPaste = document.getElementById('btn-paste');
    const btnImage = document.getElementById('btn-image');
    
    console.log('btnNew:', btnNew);
    console.log('btnOpen:', btnOpen);
    console.log('btnSave:', btnSave);
    console.log('btnImage:', btnImage);
    
    if (btnNew) btnNew.addEventListener('click', handleNewDocument);
    if (btnOpen) btnOpen.addEventListener('click', handleOpenFile);
    if (btnSave) btnSave.addEventListener('click', handleSaveFile);
    if (btnUndo) btnUndo.addEventListener('click', () => { document.execCommand('undo'); });
    if (btnRedo) btnRedo.addEventListener('click', () => { document.execCommand('redo'); });
    if (btnCut) btnCut.addEventListener('click', handleCut);
    if (btnCopy) btnCopy.addEventListener('click', handleCopy);
    if (btnPaste) btnPaste.addEventListener('click', handlePaste);
    if (btnImage) btnImage.addEventListener('click', handleInsertImage);
    
    console.log('Setting up IPC listeners');
    
    window.electronAPI.onMenuNew(() => {
        console.log('IPC: onMenuNew');
        handleNewDocument();
    });
    
    window.electronAPI.onMenuSave(() => {
        console.log('IPC: onMenuSave');
        handleSaveFile();
    });
    
    window.electronAPI.onMenuSaveAs(() => {
        console.log('IPC: onMenuSaveAs');
        handleSaveAsFile();
    });
    
    window.electronAPI.onFileOpened((content, filePath) => {
        console.log('IPC: onFileOpened', filePath);
        setDocumentContent(content, filePath);
    });
    
    window.electronAPI.onImageInserted((imagePath) => {
        console.log('IPC: onImageInserted', imagePath);
        addImage(imagePath);
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey) {
            console.log('Keydown with Ctrl:', e.key);
            switch (e.key.toLowerCase()) {
                case 'n':
                    e.preventDefault();
                    handleNewDocument();
                    break;
                case 'o':
                    e.preventDefault();
                    handleOpenFile();
                    break;
                case 's':
                    e.preventDefault();
                    if (e.shiftKey) {
                        handleSaveAsFile();
                    } else {
                        handleSaveFile();
                    }
                    break;
                case 'i':
                    e.preventDefault();
                    handleInsertImage();
                    break;
            }
        }
    });
    
    updateStatus('就绪 - 欢迎使用文档编辑器');
    console.log('Event listeners initialized');
}

console.log('renderer.js loaded');

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEventListeners);
} else {
    initEventListeners();
}
