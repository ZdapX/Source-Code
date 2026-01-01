
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// --- IMPORT MODELS (Pastikan folder models/ sudah ada) ---
const Project = require('./models/Project');
const Admin = require('./models/Admin');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- KONFIGURASI PATH & VIEW ENGINE ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- KREDENSIAL DATABASE & CLOUDINARY ---
const MONGO_URI = "mongodb+srv://braynofficial66_db_user:Oh2ivMc2GGP0SbJF@cluster0.zi2ra3a.mongodb.net/website_db?retryWrites=true&w=majority&appName=Cluster0";

cloudinary.config({
  cloud_name: 'dnb0q2s2h',
  api_key: '838368993294916',
  api_secret: 'N9U1eFJGKjJ-A8Eo4BTtSCl720c'
});

// --- SESSION CONFIG ---
app.use(session({
  secret: 'brayn_elite_secret_2024',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 Hari
}));

// --- DATABASE CONNECTION ---
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("Elite Database Connected");
    seedAdmins();
  })
  .catch(err => console.log("DB Error: ", err));

// --- MULTER STORAGE ENGINE (AUTO RESOURCE TYPE) ---
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'website_source_code',
    resource_type: 'auto', // WAJIB agar bisa upload zip, rar, py, dll
  },
});
const upload = multer({ storage: storage });

// --- MIDDLEWARE AUTH ---
const isAdmin = (req, res, next) => {
  if (req.session.adminId) return next();
  res.redirect('/login');
};

// --- SEED INITIAL ADMINS ---
async function seedAdmins() {
  try {
    const count = await Admin.countDocuments();
    if (count === 0) {
      await Admin.create([
        { 
          username: 'Silverhold', 
          pass: 'Rian', 
          name: 'SilverHold Official', 
          quote: 'Jangan lupa sholat walaupun kamu seorang pendosa...', 
          hashtag: '#bismillahcalonustad', 
          profilePic: '' 
        },
        { 
          username: 'BraynOfficial', 
          pass: 'Plerr321', 
          name: 'Brayn Official', 
          quote: 'Tidak Semua Orang Suka Kita Berkembang Pesat!', 
          hashtag: '#backenddev #frontenddev', 
          profilePic: '' 
        }
      ]);
      console.log("Admin accounts established.");
    }
  } catch (err) { console.log(err); }
}

// --- PUBLIC ROUTES ---

app.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = search ? { name: { $regex: search, $options: 'i' } } : {};
    const projects = await Project.find(query).sort({ createdAt: -1 });
    res.render('home', { projects });
  } catch (err) { res.status(500).send("Core Error"); }
});

app.get('/profile', async (req, res) => {
  const admins = await Admin.find();
  res.render('profile', { admins });
});

app.get('/project/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if(!project) return res.redirect('/');
    res.render('project-detail', { project });
  } catch (err) { res.redirect('/'); }
});

// LIKE API (MODERN)
app.post('/project/:id/like', async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, { $inc: { likes: 1 } }, { new: true });
    res.json({ success: true, totalLikes: project.likes });
  } catch (err) { res.status(500).json({ success: false }); }
});

// DOWNLOAD HANDLER (FIX FILENAME & EXTENSION)
app.get('/project/:id/download-hit', async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, { $inc: { downloads: 1 } }, { new: true });
    if (!project) return res.redirect('/');

    const safeName = project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    if (project.type === 'file') {
      let fileUrl = project.content;
      // Inject fl_attachment ke URL Cloudinary agar nama file sesuai saat didownload
      let downloadUrl = fileUrl.includes('/upload/') 
        ? fileUrl.replace('/upload/', `/upload/fl_attachment:${safeName}/`) 
        : fileUrl;
      res.redirect(downloadUrl);
    } else {
      // Jika tipe code, download sebagai .txt
      res.setHeader('Content-Disposition', `attachment; filename=${safeName}.txt`);
      res.setHeader('Content-Type', 'text/plain');
      res.send(project.content);
    }
  } catch (e) { res.redirect('back'); }
});

// --- ADMIN AUTH ROUTES ---

app.get('/login', (req, res) => res.render('login'));
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ username, pass: password });
  if (admin) {
    req.session.adminId = admin._id;
    req.session.username = admin.username;
    res.redirect('/admin/upload');
  } else {
    res.send("<script>alert('Unauthorized Access!'); window.location='/login';</script>");
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// --- ADMIN MANAGEMENT ROUTES ---

app.get('/admin/upload', isAdmin, (req, res) => res.render('admin-upload'));

app.post('/admin/upload', isAdmin, upload.fields([{ name: 'projectFile' }, { name: 'previewImg' }]), async (req, res) => {
  try {
    const { name, language, type, projectCode, note } = req.body;
    let content = type === 'file' ? (req.files['projectFile'] ? req.files['projectFile'][0].path : "") : projectCode;
    
    if (!content) return res.send("<script>alert('Data Incomplete!'); window.history.back();</script>");
    
    let preview = (req.files['previewImg'] && req.files['previewImg'][0]) ? req.files['previewImg'][0].path : "";

    await Project.create({ 
      name, language, type, content, note, preview, 
      uploadedBy: req.session.username 
    });
    res.redirect('/admin/manage');
  } catch (err) { res.status(500).send(err.message); }
});

app.get('/admin/manage', isAdmin, async (req, res) => {
  const projects = await Project.find({ uploadedBy: req.session.username }).sort({ createdAt: -1 });
  res.render('admin-manage', { projects, adminName: req.session.username });
});

app.get('/admin/delete/:id', isAdmin, async (req, res) => {
  await Project.findByIdAndDelete(req.params.id);
  res.redirect('/admin/manage');
});

app.get('/admin/edit-profile', isAdmin, async (req, res) => {
  const admin = await Admin.findById(req.session.adminId);
  res.render('admin-edit', { admin });
});

app.post('/admin/edit-profile', isAdmin, upload.single('profilePic'), async (req, res) => {
  try {
    const { name, quote, hashtag, oldPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.session.adminId);
    let updateData = { name, quote, hashtag };
    if (req.file) updateData.profilePic = req.file.path;
    
    if (oldPassword && newPassword) {
      if (admin.pass === oldPassword) {
        updateData.pass = newPassword;
      } else {
        return res.send("<script>alert('Invalid Old Password!'); window.history.back();</script>");
      }
    }
    await Admin.findByIdAndUpdate(req.session.adminId, updateData);
    res.redirect('/profile');
  } catch (err) { res.send("Update Protocol Failed"); }
});

// --- CHAT SYSTEM ---

app.get('/chat-pilih', (req, res) => res.render('chat-pilih'));

app.get('/chat/:adminTarget', async (req, res) => {
  const { adminTarget } = req.params;
  const history = await Message.find({ to: adminTarget }).sort({ timestamp: 1 }).limit(50);
  res.render('chat', { 
    history, 
    adminTarget, 
    sessionUser: req.session.username || null 
  });
});

// --- SOCKET.IO REALTIME COMMS ---
io.on('connection', (socket) => {
  socket.on('chat message', async (data) => {
    try {
      const msg = await Message.create(data);
      io.emit('chat message', msg);
    } catch (e) { console.log("Socket Error"); }
  });
});

// --- SERVER INITIALIZATION ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`System active on port ${PORT}`);
});

module.exports = app;
