const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ⚠️ APNI MONGO URL YAHAN (password change karne ke baad)
const MONGO_URL = "mongodb+srv://artsboyinvfx100_db_user:artsboyinvfx100_db_user_9Tanki123@9tanki.x3qonda.mongodb.net/blogApp?retryWrites=true&w=majority";

// ===== ADMIN CREDENTIALS =====
const ADMIN_EMAIL = 'admin@devblog.com';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_TOKEN = 'devblog-secret-token-2024';

function authAdmin(req, res, next) {
  if (req.headers['x-admin-token'] !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

mongoose.connect(MONGO_URL)
  .then(() => console.log('✅ MongoDB connected!'))
  .catch(err => console.log('❌ MongoDB error:', err.message));

// ===== SCHEMAS =====
const CommentSchema = new mongoose.Schema({
  author: { type: String, default: 'Anonymous' },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const ProductSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  authorName: { type: String, default: 'Admin' },
  category: { type: String, default: 'General' },
  featuredImage: { type: String, default: '' },
  price: { type: Number, default: 0 },
  originalPrice: { type: Number, default: 0 },
  affiliateLink: { type: String, default: '' },
  likes: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  comments: [CommentSchema],
  createdAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', ProductSchema);

// ===== ADMIN LOGIN =====
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    return res.json({ token: ADMIN_TOKEN, email });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

// ===== PUBLIC ROUTES =====
app.get('/api/posts', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/posts/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Not found' });
    res.json(product);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/posts/:id/like', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id, { $inc: { likes: 1 } }, { returnDocument: 'after' }
    );
    res.json(product);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/posts/:id/click', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id, { $inc: { clicks: 1 } }, { returnDocument: 'after' }
    );
    res.json(product);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/posts/:id/comment', async (req, res) => {
  try {
    const { author, text } = req.body;
    if (!text) return res.status(400).json({ error: 'Comment required' });
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Not found' });
    product.comments.push({ author: author || 'Anonymous', text });
    await product.save();
    res.json(product);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== ADMIN ROUTES =====
app.post('/api/posts', authAdmin, async (req, res) => {
  try {
    const { title, body, authorName, category, featuredImage, price, originalPrice, affiliateLink } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'Title and body required' });
    const product = await Product.create({
      title, body,
      authorName: authorName || 'Admin',
      category: category || 'General',
      featuredImage: featuredImage || '',
      price: price || 0,
      originalPrice: originalPrice || 0,
      affiliateLink: affiliateLink || ''
    });
    res.json(product);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/posts/:id', authAdmin, async (req, res) => {
  try {
    const { title, body, authorName, category, featuredImage, price, originalPrice, affiliateLink } = req.body;
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { title, body, authorName, category, featuredImage, price, originalPrice, affiliateLink },
      { returnDocument: 'after' }
    );
    if (!product) return res.status(404).json({ error: 'Not found' });
    res.json(product);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/posts/:id', authAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/posts/:id/comments/:commentId', authAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Not found' });
    product.comments = product.comments.filter(c => c._id.toString() !== req.params.commentId);
    await product.save();
    res.json(product);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== ADMIN STATS =====
app.get('/api/admin/stats', authAdmin, async (req, res) => {
  try {
    const products = await Product.find();
    res.json({
      totalPosts: products.length,
      totalLikes: products.reduce((s, p) => s + (p.likes || 0), 0),
      totalComments: products.reduce((s, p) => s + (p.comments?.length || 0), 0),
      totalClicks: products.reduce((s, p) => s + (p.clicks || 0), 0)
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/comments', authAdmin, async (req, res) => {
  try {
    const products = await Product.find().select('title comments');
    const all = [];
    products.forEach(p => {
      (p.comments || []).forEach(c => {
        all.push({
          _id: c._id, author: c.author, text: c.text,
          createdAt: c.createdAt, postId: p._id, postTitle: p.title
        });
      });
    });
    all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(all);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/', (req, res) => res.send('🚀 API running'));
const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running at: http://localhost:${PORT}`));