
const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    pass: { type: String, required: true },
    name: { type: String, required: true },
    quote: { type: String, default: '' },
    hashtag: { type: String, default: '' },
    profilePic: { type: String, default: '' }
});

module.exports = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);
