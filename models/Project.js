
const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    language: { type: String, required: true },
    type: { type: String, enum: ['file', 'code'], required: true },
    content: { type: String, required: true },
    note: { type: String, default: '' },
    preview: { type: String, default: '' },
    likes: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

// Cek apakah model sudah ada, jika belum baru buat (Penting untuk Vercel)
module.exports = mongoose.models.Project || mongoose.model('Project', ProjectSchema);
