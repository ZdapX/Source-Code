
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// --- IMPORT MODELS ---
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

// --- KREDENSIAL (HARDCODED SESUAI PERMINTAAN) ---
const MONGO_URI = "mongodb+srv://braynofficial66_db_user:Oh2ivMc2GGP0SbJF@cluster0.zi2ra3a.mongodb.net/website_db?retryWrites=true&w=majority&appName=Cluster0";

cloudinary.config({
  cloud_name: 'dnb0q2s2h',
  api_key: '838368993294916',
  api_secret: 'N9U1eFJGKjJ-A8Eo4BTtSCl720c'
});

// --- SESSION ---
app.use(session({
  secret: 'brayn_official_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 Hari
}));

// --- KONEKSI DATABASE ---
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("Connected to MongoDB Atlas");
    seedAdmins();
  })
  .catch(err => console.log("Database Error: ", err));

// --- MULTER & CLOUDINARY STORAGE ---
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'website_source_code',
    resource_type: 'auto'
  },
});
const upload = multer({ storage: storage });

// --- MIDDLEWARE CEK ADMIN ---
const isAdmin = (req, res, next) => {
  if (req.session.adminId) return next();
  res.redirect('/login');
};

// --- FUNGSI SEED ADMIN (DIBUAT OTOMATIS JIKA DB KOSONG) ---
async function seedAdmins() {
  try {
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
      console.log("Admin accounts created!");
    }
  } catch (err) { console.log(err); }
}

// --- ROUTES ---

// 1. HOME
app.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = search ? { name: { $regex: search, $options: 'i' } } : {};
    const projects = await Project.find(query).sort({ createdAt: -1 });
    res.render('home', { projects });
  } catch (err) { res.status(500).send("Error"); }
});

// 2. PROFILE ADMIN (PUBLIC)
app.get('/profile', async (req, res) => {
  const admins = await Admin.find();
  res.render('profile', { admins });
});

// 3. LOGIN ADMIN
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

// 4. LOGOUT
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// 5. DETAIL PROJECT & LIKE/DOWNLOAD
app.get('/project/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    res.render('project-detail', { project });
  } catch (err) { res.redirect('/'); }
});

app.post('/project/:id/like', async (req, res) => {
  const project = await Project.findByIdAndUpdate(req.params.id, { $inc: { likes: 1 } }, { new: true });
  res.json({ success: true, totalLikes: project.likes });
});

app.get('/project/:id/download-hit', async (req, res) => {
  const project = await Project.findByIdAndUpdate(req.params.id, { $inc: { downloads: 1 } });
  res.redirect(project.content);
});

// 6. ADMIN - UPLOAD PROJECT
app.get('/admin/upload', isAdmin, (req, res) => res.render('admin-upload'));
app.post('/admin/upload', isAdmin, upload.fields([{ name: 'projectFile' }, { name: 'previewImg' }]), async (req, res) => {
  try {
    const { name, language, type, projectCode, note } = req.body;
    let content = type === 'file' ? (req.files['projectFile'] ? req.files['projectFile'][0].path : "") : projectCode;
    
    if (!content) return res.send("<script>alert('Isi konten kosong!'); window.history.back();</script>");
    
    let preview = (req.files['previewImg'] && req.files['previewImg'][0]) ? req.files['previewImg'][0].path : "";

    await Project.create({ 
      name, language, type, content, note, preview, 
      uploadedBy: req.session.username 
    });
    res.redirect('/admin/manage');
  } catch (err) { res.status(500).send(err.message); }
});

// 7. ADMIN - MANAGE PROJECTS (LIST & DELETE)
app.get('/admin/manage', isAdmin, async (req, res) => {
  const projects = await Project.find({ uploadedBy: req.session.username }).sort({ createdAt: -1 });
  res.render('admin-manage', { projects, adminName: req.session.username });
});

app.get('/admin/delete/:id', isAdmin, async (req, res) => {
  await Project.findByIdAndDelete(req.params.id);
  res.redirect('/admin/manage');
});

// 8. ADMIN - EDIT PROFILE
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
        return res.send("<script>alert('Password lama salah!'); window.history.back();</script>");
      }
    }
    await Admin.findByIdAndUpdate(req.session.adminId, updateData);
    res.redirect('/profile');
  } catch (err) { res.send("Error Update"); }
});

// 9. CHAT SYSTEM (PILIH ADMIN & ROOM)
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

// --- SOCKET.IO LOGIC ---
io.on('connection', (socket) => {
  socket.on('chat message', async (data) => {
    try {
      // data berisi: { user, text, to, isAdmin }
      const msg = await Message.create(data);
      io.emit('chat message', msg); // Broadcast ke semua
    } catch (e) { console.log(e); }
  });
});

// --- SERVER LISTEN ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
