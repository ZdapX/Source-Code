// Fungsi Copy Code ke Clipboard
function copyToClipboard(elementId) {
    const text = document.getElementById(elementId).innerText;
    navigator.clipboard.writeText(text).then(() => {
        alert("Code berhasil disalin!");
    });
}

// Logic untuk USER ID otomatis di Chat
if (!localStorage.getItem('username')) {
    const randomID = Math.floor(Math.random() * 1000);
    localStorage.setItem('username', 'USER' + randomID);
}

// Toggle Upload Mode (File vs Paste Code)
function toggleUploadType() {
    const type = document.getElementById('uploadType').value;
    const fileInput = document.getElementById('fileInputSection');
    const codeInput = document.getElementById('codeInputSection');
    
    if (type === 'file') {
        fileInput.style.display = 'block';
        codeInput.style.display = 'none';
    } else {
        fileInput.style.display = 'none';
        codeInput.style.display = 'block';
    }
}
