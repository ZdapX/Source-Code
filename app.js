
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Import Models (Pastikan file-file ini sudah pakai logic mongoose.models || model)
const Project = require('./models/Project');
const Admin = require('./models/Admin');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- KONFIGURASI ---
const MONGO_URI = "mongodb+srv://braynofficial66_db_user:Oh2ivMc2GGP0SbJF@cluster0.zi2ra3a.mongodb.net/website_db?retryWrites=true&w=majority&appName=Cluster0";

cloudinary.config({
  cloud_name: 'dnb0q2s2h',
  api_key: '838368993294916',
  api_secret: 'N9U1eFJGKjJ-A8Eo4BTtSCl720c'
});

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => { console.log("MongoDB Connected"); seedAdmins(); })
  .catch(err => console.log(err));

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { folder: 'website_source_code', resource_type: 'auto' },
});
const upload = multer({ storage: storage });

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); // Penting untuk Like API
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'brayn_secret',
  resave: false,
  saveUninitialized: true
}));

// Fungsi Seed Admin
async function seedAdmins() {
    try {
        const count = await Admin.countDocuments();
        if (count === 0) {
            await Admin.create([
                { username: 'Silverhold', pass: 'Rian', name: 'SilverHold Official', quote: 'Jangan lupa sholat...', hashtag: '#bismillahcalonustad' },
                { username: 'BraynOfficial', pass: 'Plerr321', name: 'Brayn Official', quote: 'Tidak Semua Orang Suka Kita Berkembang Pesat!', hashtag: '#backenddev' }
            ]);
        }
    } catch(e) {}
}

const isAdmin = (req, res, next) => { if (req.session.adminId) return next(); res.redirect('/login'); };

// --- ROUTES ---

app.get('/', async (req, res) => {
    const { search } = req.query;
    let query = search ? { name: { $regex: search, $options: 'i' } } : {};
    const projects = await Project.find(query).sort({ createdAt: -1 });
    res.render('home', { projects });
});

app.get('/profile', async (req, res) => {
    const admins = await Admin.find();
    res.render('profile', { admins });
});

app.get('/project/:id', async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        res.render('project-detail', { project });
    } catch (e) { res.redirect('/'); }
});

// LIKE API (MODERN - TANPA REFRESH)
app.post('/project/:id/like', async (req, res) => {
    try {
        const project = await Project.findByIdAndUpdate(req.params.id, { $inc: { likes: 1 } }, { new: true });
        res.json({ success: true, totalLikes: project.likes });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// DOWNLOAD HIT
app.get('/project/:id/download-hit', async (req, res) => {
    try {
        const project = await Project.findByIdAndUpdate(req.params.id, { $inc: { downloads: 1 } }, { new: true });
        res.redirect(project.content); // Redirect ke URL Cloudinary
    } catch (e) { res.redirect('back'); }
});

app.get('/login', (req, res) => res.render('login'));
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username, pass: password });
    if (admin) { req.session.adminId = admin._id; res.redirect('/admin/upload'); }
    else { res.send("<script>alert('Gagal'); window.location='/login';</script>"); }
});

app.get('/admin/upload', isAdmin, (req, res) => res.render('admin-upload'));
app.post('/admin/upload', isAdmin, upload.fields([{ name: 'projectFile' }, { name: 'previewImg' }]), async (req, res) => {
    try {
        const { name, language, type, projectCode, note } = req.body;
        let content = type === 'file' ? (req.files['projectFile'] ? req.files['projectFile'][0].path : "") : projectCode;
        if (!content) return res.send("<script>alert('Kosong!'); window.history.back();</script>");
        let preview = req.files['previewImg'] ? req.files['previewImg'][0].path : "";
        await Project.create({ name, language, type, content, note, preview });
        res.redirect('/');
    } catch (e) { res.send(e.message); }
});

app.get('/admin/edit-profile', isAdmin, async (req, res) => {
    const admin = await Admin.findById(req.session.adminId);
    res.render('admin-edit', { admin });
});

app.post('/admin/edit-profile', isAdmin, upload.single('profilePic'), async (req, res) => {
    const { name, quote, hashtag, oldPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.session.adminId);
    let updateData = { name, quote, hashtag };
    if (req.file) updateData.profilePic = req.file.path;
    if (oldPassword && newPassword && admin.pass === oldPassword) updateData.pass = newPassword;
    await Admin.findByIdAndUpdate(req.session.adminId, updateData);
    res.redirect('/profile');
});

app.get('/chat', async (req, res) => {
    const history = await Message.find().sort({ timestamp: 1 }).limit(50);
    res.render('chat', { history });
});

io.on('connection', (socket) => {
    socket.on('chat message', async (data) => {
        const newMessage = await Message.create({ user: data.user, text: data.msg, isAdmin: data.isAdmin });
        io.emit('chat message', newMessage);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server OK"));
module.exports = app;
