
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Konfigurasi Cloudinary
cloudinary.config({
  cloud_name: 'dnb0q2s2h',
  api_key: '838368993294916',
  api_secret: 'N9U1eFJGKjJ-A8Eo4BTtSCl720c'
});

// Koneksi MongoDB
mongoose.connect('mongodb+srv://braynofficial66_db_user:Oh2ivMc2GGP0SbJF@cluster0.zi2ra3a.mongodb.net/website_db?retryWrites=true&w=majority&appName=Cluster0')
.then(() => console.log("Database Connected"));

// Schema Model
const ProjectSchema = new mongoose.Schema({
    name: String,
    language: String,
    type: String, // 'file' or 'code'
    content: String, // code text or file url
    note: String,
    preview: String,
    likes: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});
const Project = mongoose.model('Project', ProjectSchema);

const AdminSchema = new mongoose.Schema({
    username: String,
    pass: String,
    name: String,
    quote: String,
    hashtag: String,
    profilePic: String
});
const Admin = mongoose.model('Admin', AdminSchema);

// Middleware
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'secret-key', resave: false, saveUninitialized: true }));

// Setup Admin Awal (Hanya jalankan sekali jika DB kosong)
async function initAdmin() {
    const count = await Admin.countDocuments();
    if (count === 0) {
        await Admin.create([
            { username: 'Silverhold', pass: 'Rian', name: 'SilverHold Official', quote: 'Jangan lupa sholat...', hashtag: '#bismillahcalonustad', profilePic: '' },
            { username: 'BraynOfficial', pass: 'Plerr321', name: 'Brayn Official', quote: 'Tidak Semua Orang Suka Kita Berkembang Pesat!', hashtag: '#backenddev #frontenddev', profilePic: '' }
        ]);
    }
}
initAdmin();

// Routes
app.get('/', async (req, res) => {
    const search = req.query.search || '';
    const projects = await Project.find({ name: new RegExp(search, 'i') }).sort({ createdAt: -1 });
    res.render('home', { projects });
});

app.get('/profile', async (req, res) => {
    const admins = await Admin.find();
    res.render('profile', { admins });
});

app.get('/project/:id', async (req, res) => {
    const project = await Project.findById(req.params.id);
    res.render('project-detail', { project });
});

// Admin Auth & Upload (Simple logic)
app.get('/login', (req, res) => res.render('login'));
app.post('/login', async (req, res) => {
    const admin = await Admin.findOne({ username: req.body.username, pass: req.body.password });
    if (admin) {
        req.session.adminId = admin._id;
        res.redirect('/admin/upload');
    } else {
        res.send('Login Gagal');
    }
});

// Chat Logic (Simple Socket.io)
io.on('connection', (socket) => {
    socket.on('chat message', (data) => {
        io.emit('chat message', data);
    });
});

// Export untuk Vercel
module.exports = server;

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
