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

function addImage(imagePath) {
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
            <img class="image-preview" src="file://${encodeURI(image.path)}" alt="${image.name}">
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

function getDocumentContent() {
    return {
        text: editor.value,
        images: insertedImages.map(img => ({
            path: img.path,
            name: img.name
        }))
    };
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

function sendContent() {
    const content = getDocumentContent();
    window.electronAPI.sendContent(content.text, content.images);
    clearModified();
    updateStatus('已保存');
}

document.getElementById('btn-new').addEventListener('click', () => {
    if (isModified || insertedImages.length > 0) {
        updateStatus('请使用菜单中的新建功能，以确保未保存的更改得到处理');
    } else {
        setDocumentContent('');
    }
});

document.getElementById('btn-open').addEventListener('click', () => {
    updateStatus('请使用菜单中的打开功能 (Ctrl+O)');
});

document.getElementById('btn-save').addEventListener('click', () => {
    updateStatus('请使用菜单中的保存功能 (Ctrl+S)');
});

document.getElementById('btn-undo').addEventListener('click', () => {
    document.execCommand('undo');
});

document.getElementById('btn-redo').addEventListener('click', () => {
    document.execCommand('redo');
});

document.getElementById('btn-cut').addEventListener('click', () => {
    document.execCommand('cut');
});

document.getElementById('btn-copy').addEventListener('click', () => {
    document.execCommand('copy');
});

document.getElementById('btn-paste').addEventListener('click', () => {
    document.execCommand('paste');
});

document.getElementById('btn-image').addEventListener('click', () => {
    updateStatus('请使用菜单中的插入图片功能 (Ctrl+I)');
});

editor.addEventListener('input', () => {
    setModified();
});

editor.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        updateStatus('使用菜单保存 (Ctrl+S)');
    }
});

window.electronAPI.onDocumentNew(() => {
    setDocumentContent('');
});

window.electronAPI.onDocumentOpen((content, filePath) => {
    setDocumentContent(content, filePath);
});

window.electronAPI.onGetContent(() => {
    sendContent();
});

window.electronAPI.onInsertImage((imagePath) => {
    addImage(imagePath);
});

updateStatus('就绪 - 欢迎使用文档编辑器');
