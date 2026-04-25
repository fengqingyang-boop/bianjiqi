const editor = document.getElementById('editor');
const imagesContainer = document.getElementById('images-container');
const statusText = document.getElementById('status-text');

let insertedImages = [];
let isModified = false;

function updateStatus(text) {
    statusText.textContent = text;
}

function setModified() {
    if (!isModified) {
        isModified = true;
        window.electronAPI.notifyModified();
    }
}

function clearModified() {
    isModified = false;
}

function getDocumentContent() {
    return {
        text: editor.value,
        images: insertedImages.map(img => ({
            path: img.path,
            name: img.name
        }))
    };
}

async function addImage(imagePath) {
    const imageName = window.electronAPI.getFileName(imagePath);
    
    const imageInfo = {
        id: Date.now(),
        path: imagePath,
        name: imageName
    };
    
    insertedImages.push(imageInfo);
    renderImages();
    setModified();
    updateStatus('已插入图片: ' + imageName);
}

function removeImage(id) {
    const index = insertedImages.findIndex(img => img.id === id);
    if (index > -1) {
        const removedImage = insertedImages.splice(index, 1)[0];
        renderImages();
        setModified();
        updateStatus('已移除图片: ' + removedImage.name);
    }
}

function renderImages() {
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
        imageItem.innerHTML = `
            <img class="image-preview" src="file://${encodeURI(image.path).replace(/\(/g, '%28').replace(/\)/g, '%29')}" alt="${image.name}">
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

function setDocumentContent(content, filePath) {
    editor.value = content || '';
    clearModified();
    insertedImages = [];
    renderImages();
    
    if (filePath) {
        updateStatus('已打开: ' + window.electronAPI.getFileName(filePath));
    } else {
        updateStatus('新文档');
    }
}

async function sendContent() {
    const content = getDocumentContent();
    window.electronAPI.sendContent(content.text, content.images);
    clearModified();
    updateStatus('已保存');
}

async function handleNewDocument() {
    if (isModified || insertedImages.length > 0) {
        const result = await window.electronAPI.newDocument();
        if (result.success) {
            setDocumentContent('');
        }
    } else {
        setDocumentContent('');
    }
}

async function handleOpenFile() {
    const result = await window.electronAPI.dialogOpenFile();
    if (result.success) {
        setDocumentContent(result.content, result.filePath);
    } else if (result.error) {
        updateStatus('打开失败: ' + result.error);
    }
}

async function handleSaveFile() {
    const content = getDocumentContent();
    const result = await window.electronAPI.dialogSaveFile(content.text, content.images);
    if (result.success) {
        clearModified();
        updateStatus('已保存: ' + window.electronAPI.getFileName(result.filePath));
    } else if (result.error) {
        updateStatus('保存失败: ' + result.error);
    }
}

async function handleSaveAsFile() {
    const content = getDocumentContent();
    const result = await window.electronAPI.dialogSaveAsFile(content.text, content.images);
    if (result.success) {
        clearModified();
        updateStatus('已另存为: ' + window.electronAPI.getFileName(result.filePath));
    } else if (result.error) {
        updateStatus('保存失败: ' + result.error);
    }
}

async function handleInsertImage() {
    const result = await window.electronAPI.dialogInsertImage();
    if (result.success) {
        await addImage(result.imagePath);
    }
}

function handleUndo() {
    document.execCommand('undo');
    editor.focus();
}

function handleRedo() {
    document.execCommand('redo');
    editor.focus();
}

function handleCut() {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    if (start !== end) {
        const selectedText = editor.value.substring(start, end);
        navigator.clipboard.writeText(selectedText).then(() => {
            editor.value = editor.value.substring(0, start) + editor.value.substring(end);
            editor.selectionStart = editor.selectionEnd = start;
            setModified();
            updateStatus('已剪切');
        });
    }
}

function handleCopy() {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    if (start !== end) {
        const selectedText = editor.value.substring(start, end);
        navigator.clipboard.writeText(selectedText).then(() => {
            updateStatus('已复制');
        });
    }
}

function handlePaste() {
    navigator.clipboard.readText().then(text => {
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        editor.value = editor.value.substring(0, start) + text + editor.value.substring(end);
        editor.selectionStart = editor.selectionEnd = start + text.length;
        setModified();
        updateStatus('已粘贴');
    });
}

document.getElementById('btn-new').addEventListener('click', handleNewDocument);
document.getElementById('btn-open').addEventListener('click', handleOpenFile);
document.getElementById('btn-save').addEventListener('click', handleSaveFile);
document.getElementById('btn-undo').addEventListener('click', handleUndo);
document.getElementById('btn-redo').addEventListener('click', handleRedo);
document.getElementById('btn-cut').addEventListener('click', handleCut);
document.getElementById('btn-copy').addEventListener('click', handleCopy);
document.getElementById('btn-paste').addEventListener('click', handlePaste);
document.getElementById('btn-image').addEventListener('click', handleInsertImage);

editor.addEventListener('input', () => {
    setModified();
});

editor.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSaveFile();
    }
});

window.electronAPI.onDocumentNew(() => {
    setDocumentContent('');
});

window.electronAPI.onDocumentOpen((content, filePath) => {
    setDocumentContent(content, filePath);
});

window.electronAPI.onGetContent((action) => {
    if (action === 'save') {
        sendContent();
    }
});

window.electronAPI.onInsertImage((imagePath) => {
    addImage(imagePath);
});

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey) {
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
                if (e.shiftKey) {
                    e.preventDefault();
                    handleSaveAsFile();
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
