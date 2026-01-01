
const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    language: { type: String, required: true },
    type: { type: String, enum: ['file', 'code'], required: true },
    content: { type: String }, // Digunakan untuk teks kodingan (Paste Code)
    
    // Field baru untuk menyimpan file langsung di MongoDB
    fileData: { type: Buffer }, 
    fileType: { type: String }, // Contoh: application/zip
    fileName: { type: String }, // Contoh: projek_saya.zip
    
    note: { type: String, default: '' },
    preview: { type: String, default: '' }, // Preview gambar tetap di Cloudinary (karena gambar jarang error 401)
    likes: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
    uploadedBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Project || mongoose.model('Project', ProjectSchema);
