// VIPCall server.js — Node.js + Express + MongoDB Backend

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8888;

// Trust proxy for secure cookies in production (e.g. Render/Railway)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://picsum.photos", "*"] // Allow images
    }
  }
}));

app.use(express.json({ limit: '10mb' })); // Support base64 image uploads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session setup
app.use(session({
  name: 'vipcall_sid',
  secret: process.env.SESSION_SECRET || 'vipcall_default_secret_key_8390',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vipcall',
    ttl: 14 * 24 * 60 * 60, // 14 days
    autoRemove: 'native'
  }),
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// Request Logger Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`[HTTP] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - SessionAdmin: ${req.session ? req.session.adminId : 'none'} (${Date.now() - start}ms)`);
  });
  next();
});

// Disable caching for all API endpoints
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// Serve static frontend files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vipcall')
  .then(() => {
    console.log('Successfully connected to MongoDB.');
    initializeAdminUser();
    initializeProducts();
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
  });

// --- Mongoose Schemas ---

const productSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  category: { type: String, required: true, enum: ['Indian', 'Russian'] },
  whatsapp: { type: String, required: true },
  description: { type: String, required: true, trim: true },
  image: { type: String, required: true }, // Base64 or URL
  createdAt: { type: Date, default: Date.now }
});

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true }
});

const Product = mongoose.model('Product', productSchema);
const Admin = mongoose.model('Admin', adminSchema);

// Auto-initialize admin user if none exists
async function initializeAdminUser() {
  try {
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const defaultUsername = process.env.ADMIN_USERNAME || 'admin';
      const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
      const passwordHash = await bcrypt.hash(defaultPassword, 10);
      
      const newAdmin = new Admin({
        username: defaultUsername,
        passwordHash: passwordHash
      });
      await newAdmin.save();
      console.log(`Default admin account initialized. Username: ${defaultUsername}`);
    }
  } catch (err) {
    console.error('Error seeding admin user:', err);
  }
}

// Auto-initialize products with INR catalog if none exist
async function initializeProducts() {
  try {
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      const seedItems = [
        {
          title: "Royal Enfield Bullet 350",
          price: 145000,
          category: "Indian",
          whatsapp: "919876543210",
          description: "Used Royal Enfield Bullet 350 in excellent condition. 2021 model, black color, single owner, driven 12,000 km. Regularly serviced, clean documents, insurance active.",
          image: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&q=80&w=600"
        },
        {
          title: "Vintage Zenit-E SLR Camera",
          price: 8500,
          category: "Russian",
          whatsapp: "919876543210",
          description: "Classic Russian Zenit-E 35mm film camera. Solid metal body. Comes with Helios-44-2 58mm f/2 lens. Fully mechanical, shutter speeds working, lens glass is clean.",
          image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=600"
        },
        {
          title: "Handwoven Banarasi Silk Saree",
          price: 18500,
          category: "Indian",
          whatsapp: "919876543210",
          description: "Authentic pure silk Banarasi Saree with intricate gold zari work. Red and gold color combination, perfect for weddings. Unused, brand new condition with tags.",
          image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=600"
        }
      ];
      await Product.insertMany(seedItems);
      console.log("Default Indian and Russian catalog items initialized in Rupee prices.");
    } else {
      console.log("Database already initialized. Skipping product seeding.");
    }
  } catch (err) {
    console.error('Error seeding initial items:', err);
  }
}

// --- Middlewares ---

// Check if request is authenticated
function requireAuth(req, res, next) {
  if (req.session && req.session.adminId) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized. Please login first.' });
}

// --- API Endpoints ---

// Check Authentication Status
app.get('/api/auth/status', (req, res) => {
  if (req.session && req.session.adminId) {
    res.json({ loggedIn: true });
  } else {
    res.json({ loggedIn: false });
  }
});

// Login Administrator
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const admin = await Admin.findOne({ username: username.toLowerCase().trim() });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const match = await bcrypt.compare(password, admin.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Set Session
    req.session.adminId = admin._id;
    req.session.save(err => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Server error saving session.' });
      }
      res.json({ success: true, message: 'Logged in successfully.' });
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// Logout Administrator
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Failed to destroy session.' });
    }
    res.clearCookie('vipcall_sid');
    res.json({ success: true, message: 'Logged out successfully.' });
  });
});

// Get Products List (Publicly accessible)
app.get('/api/products', async (req, res) => {
  const { category } = req.query;
  const filter = {};
  
  if (category && (category === 'Indian' || category === 'Russian')) {
    filter.category = category;
  }

  try {
    const productsList = await Product.find(filter).sort({ createdAt: -1 });
    res.json(productsList);
  } catch (err) {
    console.error('Fetch items error:', err);
    res.status(500).json({ error: 'Server error fetching items.' });
  }
});

// Add Product (Secure endpoint)
app.post('/api/products', requireAuth, async (req, res) => {
  const { title, price, category, whatsapp, description, image } = req.body;

  // Basic validation
  if (!title || !price || !category || !whatsapp || !description || !image) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const parsedPrice = parseFloat(price);
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    return res.status(400).json({ error: 'Price must be a valid positive number.' });
  }

  // Constrain filters to strictly Indian or Russian
  if (category !== 'Indian' && category !== 'Russian') {
    return res.status(400).json({ error: 'Category must be either "Indian" or "Russian".' });
  }

  try {
    const newProduct = new Product({
      title: title.trim(),
      price: parsedPrice,
      category,
      whatsapp: whatsapp.trim(),
      description: description.trim(),
      image
    });

    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (err) {
    console.error('Add item error:', err);
    res.status(500).json({ error: 'Server error creating item.' });
  }
});

// Update Product (Secure endpoint)
app.put('/api/products/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { title, price, category, whatsapp, description, image } = req.body;

  // Basic validation
  if (!title || !price || !category || !whatsapp || !description || !image) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const parsedPrice = parseFloat(price);
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    return res.status(400).json({ error: 'Price must be a valid positive number.' });
  }

  if (category !== 'Indian' && category !== 'Russian') {
    return res.status(400).json({ error: 'Category must be either "Indian" or "Russian".' });
  }

  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      {
        title: title.trim(),
        price: parsedPrice,
        category,
        whatsapp: whatsapp.trim(),
        description: description.trim(),
        image
      },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ error: 'Item not found.' });
    }
    res.json(updatedProduct);
  } catch (err) {
    console.error('Update item error:', err);
    res.status(500).json({ error: 'Server error updating item.' });
  }
});

// Delete Product (Secure endpoint)
app.delete('/api/products/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const deletedProduct = await Product.findByIdAndDelete(id);
    if (!deletedProduct) {
      return res.status(404).json({ error: 'Item not found.' });
    }
    res.json({ success: true, message: 'Item deleted successfully.' });
  } catch (err) {
    console.error('Delete item error:', err);
    res.status(500).json({ error: 'Server error deleting item.' });
  }
});

// Fallback to serve index.html for undefined UI routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`VIPCall backend running on port ${PORT}`);
});
