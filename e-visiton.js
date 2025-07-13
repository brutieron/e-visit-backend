const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const db = require('./config/db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ================================================
//               SPECIAL WEBHOOK ROUTE
// This MUST come before express.json() for Stripe
// ================================================
app.use('/api/webhook', require('./routes/webhookRoutes'));

// ================================================
//               STATIC FILE SERVING
// ================================================
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// ================================================
//                   CORE MIDDLEWARE
// ================================================
app.use(cors());
app.use(express.json());

// ================================================
//               DATABASE CONNECTION
// ================================================
db.query('SELECT 1')
  .then(() => console.log('✅ MySQL Connected'))
  .catch((err) => console.error('❌ MySQL Connection Error:', err));

// ================================================
//                   API ROUTES
// ================================================
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/payment', require('./routes/paymentRoutes'));
app.use('/api/business', require('./routes/businessRoutes'));
app.use('/api/boost', require('./routes/boostRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/cities', require('./routes/cityRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/collaborate', require('./routes/collaborationRoutes'));
app.use('/api/stats', require('./routes/statsRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/license', require('./routes/licenseRoutes'));
app.use('/api/invoices', require('./routes/invoiceRoutes'));
app.use('/api/offers', require('./routes/offerRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/ai-knowledge', require ('./routes/knowledgeRoutes'));
app.use('/api/blogs', require('./routes/blogRoutes'));

// ================================================
//                   SERVER START
// ================================================
app.get('/', (req, res) => {
  res.send('E-Visit Backend is Live');
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
