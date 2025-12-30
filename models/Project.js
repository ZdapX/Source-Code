
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
    uploadedBy: { type: String, required: true }, // 'Silverhold' atau 'BraynOfficial'
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Project || mongoose.model('Project', ProjectSchema);
