
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Import Models
const Project = require('./models/Project');
const Admin = require('./models/Admin');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- KONFIGURASI DATABASE & CLOUDINARY ---
const MONGO_URI = "mongodb+srv://braynofficial66_db_user:Oh2ivMc2GGP0SbJF@cluster0.zi2ra3a.mongodb.net/website_db?retryWrites=true&w=majority&appName=Cluster0";

cloudinary.config({
  cloud_name: 'dnb0q2s2h',
  api_key: '838368993294916',
  api_secret: 'N9U1eFJGKjJ-A8Eo4BTtSCl720c'
});

mongoose.connect(MONGO_URI)
  .then(() => {
      console.log("MongoDB Connected...");
      seedAdmins(); // Inisialisasi admin saat pertama kali jalan
  })
  .catch(err => console.log(err));

// --- KONFIGURASI STORAGE ---
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'website_source_code',
    resource_type: 'auto'
  },
});
const upload = multer({ storage: storage });

// --- MIDDLEWARE ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'brayn_secret_key_123',
  resave: false,
  saveUninitialized: true
}));

// Fungsi Inisialisasi Admin Default
async function seedAdmins() {
    const count = await Admin.countDocuments();
    if (count === 0) {
        await Admin.create([
            { 
                username: 'Silverhold', 
                pass: 'Rian', 
                name: 'SilverHold Official', 
                quote: 'Jangan lupa sholat walaupun kamu seorang pendosa allah lebih suka orang pendosa yang sering bertaubat dari pada orang yang merasa suci', 
                hashtag: '#bismillahcalonustad', 
                profilePic: '' 
            },
            { 
                username: 'BraynOfficial', 
                pass: 'Plerr321', 
                name: 'Brayn Official', 
                quote: 'Tidak Semua Orang Suka Kita Berkembang Pesat!', 
                hashtag: '#backenddev #frontenddev #BraynOfficial', 
                profilePic: '' 
            }
        ]);
        console.log("Admins Seeded!");
    }
}

// Middleware Cek Login
const isAdmin = (req, res, next) => {
    if (req.session.adminId) return next();
    res.redirect('/login');
};

// --- ROUTES ---

// 1. Home - List Project & Search
app.get('/', async (req, res) => {
    const { search } = req.query;
    let query = {};
    if (search) {
        query = { name: { $regex: search, $options: 'i' } };
    }
    const projects = await Project.find(query).sort({ createdAt: -1 });
    res.render('home', { projects });
});

// 2. Profile Admin
app.get('/profile', async (req, res) => {
    const admins = await Admin.find();
    res.render('profile', { admins });
});

// 3. Project Detail
app.get('/project/:id', async (req, res) => {
    const project = await Project.findById(req.params.id);
    res.render('project-detail', { project });
});

// 4. Like & Download Counter (API)
app.post('/project/:id/like', async (req, res) => {
    await Project.findByIdAndUpdate(req.params.id, { $inc: { likes: 1 } });
    res.redirect('back');
});

app.get('/project/:id/download-hit', async (req, res) => {
    const project = await Project.findByIdAndUpdate(req.params.id, { $inc: { downloads: 1 } });
    res.redirect(project.content); // Redirect ke file asli atau tampilkan sukses
});

// 5. Login
app.get('/login', (req, res) => res.render('login'));
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username, pass: password });
    if (admin) {
        req.session.adminId = admin._id;
        req.session.username = admin.username;
        res.redirect('/admin/upload');
    } else {
        res.send("<script>alert('Login Gagal!'); window.location='/login';</script>");
    }
});

// 6. Admin Upload
app.get('/admin/upload', isAdmin, (req, res) => res.render('admin-upload'));
app.post('/admin/upload', isAdmin, upload.fields([{ name: 'projectFile' }, { name: 'previewImg' }]), async (req, res) => {
    const { name, language, type, projectCode, note } = req.body;
    
    let content = "";
    if (type === 'file') {
        content = req.files['projectFile'] ? req.files['projectFile'][0].path : "";
    } else {
        content = projectCode;
    }

    const preview = req.files['previewImg'] ? req.files['previewImg'][0].path : "";

    await Project.create({
        name, language, type, content, note, preview
    });
    res.redirect('/');
});

// 7. Admin Edit Profile
app.get('/admin/edit-profile', isAdmin, async (req, res) => {
    const admin = await Admin.findById(req.session.adminId);
    res.render('admin-edit', { admin });
});

app.post('/admin/edit-profile', isAdmin, upload.single('profilePic'), async (req, res) => {
    const { name, quote, hashtag, oldPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.session.adminId);

    let updateData = { name, quote, hashtag };
    
    if (req.file) updateData.profilePic = req.file.path;
    
    if (oldPassword && newPassword) {
        if (admin.pass === oldPassword) {
            updateData.pass = newPassword;
        } else {
            return res.send("<script>alert('Password lama salah!'); window.history.back();</script>");
        }
    }

    await Admin.findByIdAndUpdate(req.session.adminId, updateData);
    res.redirect('/profile');
});

// 8. Chat Room
app.get('/chat', async (req, res) => {
    const history = await Message.find().sort({ timestamp: 1 }).limit(50);
    res.render('chat', { history });
});

// 9. Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// --- SOCKET.IO REALTIME CHAT ---
io.on('connection', (socket) => {
    socket.on('chat message', async (data) => {
        // Simpan ke DB
        const newMessage = await Message.create({
            user: data.user,
            text: data.msg,
            isAdmin: data.isAdmin || false
        });
        // Broadcast ke semua orang
        io.emit('chat message', newMessage);
    });
});

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
