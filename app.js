
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

// --- CONFIGURATION ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const MONGO_URI = "mongodb+srv://braynofficial66_db_user:Oh2ivMc2GGP0SbJF@cluster0.zi2ra3a.mongodb.net/website_db?retryWrites=true&w=majority&appName=Cluster0";

cloudinary.config({
  cloud_name: 'dnb0q2s2h',
  api_key: '838368993294916',
  api_secret: 'N9U1eFJGKjJ-A8Eo4BTtSCl720c'
});

app.use(session({
  secret: 'brayn_elite_2024',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => { console.log("Elite Database Connected"); seedAdmins(); })
  .catch(err => console.log(err));

// Multer Storage - Resource Type 'auto' is MANDATORY for zips
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'website_source_code',
    resource_type: 'auto', 
  },
});
const upload = multer({ storage: storage });

async function seedAdmins() {
  const count = await Admin.countDocuments();
  if (count === 0) {
    await Admin.create([
      { username: 'Silverhold', pass: 'Rian', name: 'SilverHold Official', quote: 'Jangan lupa sholat...', hashtag: '#bismillahcalonustad' },
      { username: 'BraynOfficial', pass: 'Plerr321', name: 'Brayn Official', quote: 'Tidak Semua Orang Suka Kita Berkembang Pesat!', hashtag: '#backenddev' }
    ]);
  }
}

const isAdmin = (req, res, next) => { if (req.session.adminId) return next(); res.redirect('/login'); };

// --- ROUTES ---

app.get('/', async (req, res) => {
  const { search } = req.query;
  let query = search ? { name: { $regex: search, $options: 'i' } } : {};
  const projects = await Project.find(query).sort({ createdAt: -1 });
  res.render('home', { projects });
});

app.get('/project/:id', async (req, res) => {
  const project = await Project.findById(req.params.id);
  res.render('project-detail', { project });
});

// FIX DOWNLOAD LOGIC
app.get('/project/:id/download-hit', async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, { $inc: { downloads: 1 } }, { new: true });
    if (!project) return res.redirect('/');

    if (project.type === 'file') {
      const fileUrl = project.content;
      // Ambil ekstensi asli (zip, rar, py, dll) dari URL Cloudinary
      const extension = fileUrl.split('.').pop().split('?')[0]; 
      // Buat nama file aman
      const safeName = project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const fullName = `${safeName}.${extension}`;

      /**
       * ULTIMATE FIX: 
       * Cloudinary butuh flag fl_attachment dengan nama file lengkap + ekstensi.
       */
      let downloadUrl = fileUrl.replace('/upload/', `/upload/fl_attachment:${fullName}/`);
      
      res.redirect(downloadUrl);
    } else {
      const safeName = project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      res.setHeader('Content-Disposition', `attachment; filename=${safeName}.txt`);
      res.send(project.content);
    }
  } catch (e) { res.redirect('back'); }
});

app.post('/project/:id/like', async (req, res) => {
  const project = await Project.findByIdAndUpdate(req.params.id, { $inc: { likes: 1 } }, { new: true });
  res.json({ success: true, totalLikes: project.likes });
});

app.get('/login', (req, res) => res.render('login'));
app.post('/login', async (req, res) => {
  const admin = await Admin.findOne({ username: req.body.username, pass: req.body.password });
  if (admin) { req.session.adminId = admin._id; req.session.username = admin.username; res.redirect('/admin/upload'); }
  else res.send("Unauthorized");
});

app.get('/admin/upload', isAdmin, (req, res) => res.render('admin-upload'));
app.post('/admin/upload', isAdmin, upload.fields([{name:'projectFile'}, {name:'previewImg'}]), async (req, res) => {
  const { name, language, type, projectCode, note } = req.body;
  let content = type === 'file' ? (req.files['projectFile'] ? req.files['projectFile'][0].path : "") : projectCode;
  let preview = req.files['previewImg'] ? req.files['previewImg'][0].path : "";
  await Project.create({ name, language, type, content, note, preview, uploadedBy: req.session.username });
  res.redirect('/admin/manage');
});

app.get('/admin/manage', isAdmin, async (req, res) => {
  const projects = await Project.find({ uploadedBy: req.session.username }).sort({ createdAt: -1 });
  res.render('admin-manage', { projects, adminName: req.session.username });
});

app.get('/admin/delete/:id', isAdmin, async (req, res) => {
  await Project.findByIdAndDelete(req.params.id);
  res.redirect('/admin/manage');
});

// Chat & Profile logic... (sama seperti sebelumnya)
app.get('/profile', async (req, res) => { res.render('profile', { admins: await Admin.find() }); });
app.get('/chat-pilih', (req, res) => res.render('chat-pilih'));
app.get('/chat/:adminTarget', async (req, res) => {
  const history = await Message.find({ to: req.params.adminTarget }).sort({ timestamp: 1 });
  res.render('chat', { history, adminTarget: req.params.adminTarget, sessionUser: req.session.username || null });
});

io.on('connection', (socket) => {
  socket.on('chat message', async (data) => {
    const msg = await Message.create(data);
    io.emit('chat message', msg);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("System Active"));
module.exports = app;
