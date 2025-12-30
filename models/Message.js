
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    user: { type: String, required: true },
    text: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    to: { type: String, required: true }, // Ditujukan ke: 'Silverhold' atau 'BraynOfficial'
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Message || mongoose.model('Message', MessageSchema);
