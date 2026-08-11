import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config, prisma } from './config.js';
import authRoutes from './routes/authRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import codeRoutes from './routes/codeRoutes.js';
import { setupQuizSocket } from './sockets/quizSocket.js';

const app = express();
const server = http.createServer(app);

// Enable CORS for frontend
app.use(
  cors({
    origin: '*',
    credentials: true
  })
);

app.use(express.json());

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Setup real-time quiz socket handlers
setupQuizSocket(io);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    serverTime: new Date().toISOString(),
    service: 'LiveClass Quiz API'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/code', codeRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({
    message: 'Internal server error',
    error: config.nodeEnv === 'development' ? err.message : undefined
  });
});

server.listen(config.port, () => {
  console.log(`=========================================`);
  console.log(`🚀 LiveClass Quiz Server running on port ${config.port}`);
  console.log(`🌐 Health check: http://localhost:${config.port}/api/health`);
  console.log(`=========================================`);
});
