
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const db = require('./config/db');
const webhookRoute = require('./routes/webhookRoutes');
const http = require('http'); // ✅ 1. Import the http module
const { Server } = require("socket.io"); // ✅ 2. Import the socket.io Server class
// const jwt = require('jsonwebtoken'); // ✅ Import JWT if you use it for auth

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ 3. Create an HTTP server from the Express app
const server = http.createServer(app);

// ✅ 4. Initialize socket.io and configure CORS
const io = new Server(server, {
  cors: {
    origin: "https://e-visiton.com", // Restrict to your frontend URL
    methods: ["GET", "POST"]
  }
});

// ================================================
//           SPECIAL WEBHOOK BODY PARSING
// ================================================
app.use('/api/webhook', express.raw({ type: 'application/json' }), webhookRoute);

// ================================================
//               STATIC FILE SERVING
// ================================================
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// ================================================
//               CORE MIDDLEWARE
// ================================================
// ✅ Adjusted CORS settings for the main Express app
app.use(cors({
  origin: "https://e-visiton.com"
}));
app.use(express.json());

// ================================================
//               DATABASE CONNECTION
// ================================================
db.query('SELECT 1')
  .then(() => console.log('✅ MySQL Connected'))
  .catch((err) => console.error('❌ MySQL Connection Error:', err));

// ================================================
//         ✅ SOCKET.IO CONNECTION LOGIC
// ================================================

// Optional: Middleware to authenticate sockets
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  // Here, you would verify the token.
  // This is a placeholder for your actual authentication logic.
  if (token) {
    // For example, using JWT:
    // jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    //   if (err) return next(new Error('Authentication error'));
    //   socket.user = user;
    //   next();
    // });
    console.log("Socket authenticated successfully.");
    next();
  } else {
    // Allow connection even without a token for guest user tracking
    console.log("Socket connected as guest.");
    next();
  }
});


io.on('connection', (socket) => {
  console.log('✅ A user connected:', socket.id);

  // Send the current user count to the newly connected client
  socket.emit('updateUserCount', io.engine.clientsCount);

  // Broadcast the updated user count to all clients
  io.emit('updateUserCount', io.engine.clientsCount);

  socket.on('disconnect', () => {
    console.log('❌ User disconnected:', socket.id);
    // Broadcast the updated count to all remaining clients
    io.emit('updateUserCount', io.engine.clientsCount);
  });
});

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
app.use('/api/ai-knowledge', require('./routes/knowledgeRoutes'));
app.use('/api/blogs', require('./routes/blogRoutes'));

// ================================================
//                   SERVER START
// ================================================
app.get('/', (req, res) => {
  res.send('E-Visit Backend is Live');
});

server.listen(PORT, () => {
  console.log(`🚀 Server running with WebSocket on http://localhost:${PORT}`);
});