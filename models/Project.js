
const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    language: {
        type: String, // Contoh: Javascript, Python, PHP
        required: true
    },
    type: {
        type: String,
        enum: ['file', 'code'], // Menentukan apakah project berupa file download atau paste code
        required: true
    },
    content: {
        type: String, // Jika 'file' isinya URL Cloudinary, jika 'code' isinya teks kode
        required: true
    },
    note: {
        type: String,
        default: ''
    },
    preview: {
        type: String, // URL Gambar preview dari Cloudinary
        default: ''
    },
    likes: {
        type: Number,
        default: 0
    },
    downloads: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Project', ProjectSchema);
