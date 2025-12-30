
const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    pass: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    quote: {
        type: String,
        default: ''
    },
    hashtag: {
        type: String, // Contoh: #webdev #backend
        default: ''
    },
    profilePic: {
        type: String, // URL Foto Profile dari Cloudinary
        default: 'https://via.placeholder.com/150'
    }
});

module.exports = mongoose.model('Admin', AdminSchema);
