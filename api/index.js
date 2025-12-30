
const express = require('express');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');
const session = require('cookie-session');

const app = express();

// Konfigurasi Cloudinary (Sesuai request kamu)
cloudinary.config({
  cloud_name: 'dnb0q2s2h',
  api_key: '838368993294916',
  api_secret: 'N9U1eFJGKjJ-A8Eo4BTtSCl720c'
});

// Setup Database (Ganti URL ini dengan MongoDB Atlas-mu)
const MONGODB_URI = "ISI_DENGAN_URL_MONGODB_KAMU"; 
mongoose.connect(MONGODB_URI).then(() => console.log("DB Connected"));

// Schema Database
const ProjectSchema = new mongoose.Schema({
  name: String,
  language: String,
  type: String, // 'file' atau 'code'
  content: String, // URL file atau teks code
  note: String,
  preview: String,
  likes: { type: Number, default: 0 },
  downloads: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const AdminSchema = new mongoose.Schema({
  username: String,
  name: String,
  quote: String,
  tags: String,
  image: String,
  password: String
});

const Project = mongoose.model('Project', ProjectSchema);
const Admin = mongoose.model('Admin', AdminSchema);

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.urlencoded({ extended: true }));
app.use(session({ name: 'session', keys: ['secretkey'] }));

// Storage Konfigurasi
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { folder: 'source_code_projek', resource_type: 'auto' }
});
const upload = multer({ storage: storage });

// --- ROUTES ---

// Home
app.get('/', async (req, res) => {
  const search = req.query.search || "";
  const projects = await Project.find({ name: new RegExp(search, 'i') }).sort({ createdAt: -1 });
  res.render('home', { projects });
});

// Profile Admin
app.get('/profile', async (req, res) => {
  const admins = await Admin.find();
  res.render('profile', { admins });
});

// Detail Projek
app.get('/project/:id', async (req, res) => {
  const project = await Project.findById(req.params.id);
  res.render('project-detail', { project });
});

// Download & Like Logic (Real-time update)
app.post('/like/:id', async (req, res) => {
  await Project.findByIdAndUpdate(req.params.id, { $inc: { likes: 1 } });
  res.redirect('back');
});

app.get('/download/:id', async (req, res) => {
  const p = await Project.findByIdAndUpdate(req.params.id, { $inc: { downloads: 1 } });
  res.redirect(p.content);
});

// Login Admin
app.get('/login', (req, res) => res.render('login'));
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ username, password });
  if (admin) {
    req.session.adminId = admin._id;
    res.redirect('/admin/upload');
  } else {
    res.send("Gagal Login");
  }
});

// Upload Page
app.get('/admin/upload', (req, res) => {
  if (!req.session.adminId) return res.redirect('/login');
  res.render('upload');
});

app.post('/admin/upload', upload.fields([{ name: 'file' }, { name: 'previewImg' }]), async (req, res) => {
  const { name, language, type, codeText, note, previewUrl } = req.body;
  let finalContent = type === 'code' ? codeText : req.files['file'][0].path;
  let finalPreview = previewUrl || (req.files['previewImg'] ? req.files['previewImg'][0].path : '');

  await Project.create({
    name, language, type, content: finalContent, note, preview: finalPreview
  });
  res.redirect('/');
});

module.exports = app;
