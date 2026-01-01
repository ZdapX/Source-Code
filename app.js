
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// --- MODELS ---
const Project = require('./models/Project');
const Admin = require('./models/Admin');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- SETTINGS ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const MONGO_URI = "mongodb+srv://braynofficial66_db_user:Oh2ivMc2GGP0SbJF@cluster0.zi2ra3a.mongodb.net/website_db?retryWrites=true&w=majority&appName=Cluster0";

// KONFIGURASI CLOUDINARY (HARDCODED)
cloudinary.config({
  cloud_name: 'dnb0q2s2h',
  api_key: '838368993294916',
  api_secret: 'N9U1eFJGKjJ-A8Eo4BTtSCl720c'
});

app.use(session({
  secret: 'brayn_elite_final_ultimate_2026',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => { console.log("Elite Database Connected"); seedAdmins(); });

// STORAGE CONFIG - MEMASTIKAN EKSTENSI TERSIMPAN
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const ext = path.extname(file.originalname).toLowerCase(); 
    const baseName = path.basename(file.originalname, ext).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    return {
      folder: 'website_source_code',
      resource_type: 'auto', 
      public_id: `${baseName}-${Date.now()}${ext}`, 
    };
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

// --- ELITE ROUTES ---

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

/**
 * FIX 401 UNAUTHORIZED (THE FINAL SOLUTION)
 * Kita membedah URL untuk mendapatkan PublicID yang bersih, 
 * lalu membuat Signed URL resmi dari Cloudinary SDK.
 */
app.get('/project/:id/download-hit', async (req, res) => {
    try {
        const project = await Project.findByIdAndUpdate(req.params.id, { $inc: { downloads: 1 } }, { new: true });
        if (!project) return res.redirect('/');

        const safeName = project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

        if (project.type === 'file') {
            const fileUrl = project.content;
            
            // 1. Ekstrak Public ID dari URL Cloudinary secara akurat
            // Menghapus domain dan versi (v17xxxxxx)
            const regex = /upload\/v\d+\/(.+)$/;
            const match = fileUrl.match(regex);
            
            if (match && match[1]) {
                const publicId = match[1]; // Hasilnya: website_source_code/file.zip
                
                // 2. Buat URL yang ditandatangani (Signed) agar bypass 401
                const signedUrl = cloudinary.url(publicId, {
                    resource_type: 'raw',
                    sign_url: true,
                    flags: `attachment:${safeName}`, // Memaksa download dengan nama projek
                    secure: true
                });

                res.redirect(signedUrl);
            } else {
                // Fallback jika regex gagal, langsung redirect asli
                res.redirect(fileUrl);
            }
        } else {
            // Jika tipe CODE, kirim sebagai .txt
            res.setHeader('Content-Disposition', `attachment; filename="${safeName}.txt"`);
            res.setHeader('Content-Type', 'text/plain');
            res.send(project.content);
        }
    } catch (e) {
        console.error(e);
        res.redirect('back');
    }
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
  try {
    const { name, language, type, projectCode, note } = req.body;
    let content = type === 'file' ? (req.files['projectFile'] ? req.files['projectFile'][0].path : "") : projectCode;
    let preview = (req.files['previewImg'] && req.files['previewImg'][0]) ? req.files['previewImg'][0].path : "";
    await Project.create({ name, language, type, content, note, preview, uploadedBy: req.session.username });
    res.redirect('/admin/manage');
  } catch(e) { res.status(500).send(e.message); }
});

app.get('/admin/manage', isAdmin, async (req, res) => {
  const projects = await Project.find({ uploadedBy: req.session.username }).sort({ createdAt: -1 });
  res.render('admin-manage', { projects, adminName: req.session.username });
});

app.get('/admin/delete/:id', isAdmin, async (req, res) => {
  await Project.findByIdAndDelete(req.params.id);
  res.redirect('/admin/manage');
});

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
server.listen(PORT, () => console.log("Elite System Active"));
module.exports = app;
