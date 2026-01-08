const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// MongoDB Connection
const MONGODB_URI = process.env.MONGO_URI || 'mongodb+srv://daftscope:CHAINXAU.29j@cluster0.impydmt.mongodb.net/?appName=Cluster0';
mongoose.connect(MONGODB_URI, {})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error('MongoDB Connection Error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/home', require('./routes/home'));
app.use('/api/polls', require('./routes/polls'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/highlights', require('./routes/highlights'));
app.use('/api/news', require('./routes/news'));
app.use('/api/live-matches', require('./routes/liveMatches'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/fan-groups', require('./routes/fanGroups'));
app.use('/api/statistics', require('./routes/statistics'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/products', require('./routes/products'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/prediction-forums', require('./routes/predictionForums'));
app.use('/api/predictions', require('./routes/predictions'));

// Socket.io for real-time chat
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-chat', (userId) => {
    socket.join('live-chat');
    console.log(`User ${userId} joined live chat`);
  });

  socket.on('send-message', async (data) => {
    // Save message to database (handled in chat controller)
    io.to('live-chat').emit('new-message', data);
  });

  socket.on('join-fan-group', (groupId) => {
    socket.join(`fan-group-${groupId}`);
    console.log(`User joined fan group ${groupId}`);
  });

  socket.on('join-live-match', (matchId) => {
    socket.join(`live-match-${matchId}`);
    console.log(`User joined live match ${matchId}`);
  });

  socket.on('leave-live-match', (matchId) => {
    socket.leave(`live-match-${matchId}`);
    console.log(`User left live match ${matchId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io available to routes
app.set('io', io);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Global error handler - must have 4 parameters for Express to recognize it
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  if (!res.headersSent) {
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal server error'
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

