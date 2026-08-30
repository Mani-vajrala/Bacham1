import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { config, prisma } from './config.js';
import authRoutes from './routes/authRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import codeRoutes from './routes/codeRoutes.js';
import { setupQuizSocket } from './sockets/quizSocket.js';

const app = express();
const server = http.createServer(app);

// Enable dynamic CORS for frontend & remote clients (Vercel, local, Wi-Fi)
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  })
);

app.use(express.json());

// Setup Socket.IO with dynamic CORS
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingInterval: 10000,
  pingTimeout: 5000
});

// Setup real-time quiz socket handlers
setupQuizSocket(io);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    serverTime: new Date().toISOString(),
    service: 'Class Connect API'
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

// Auto-ensure default demo professor and quiz exist on server boot
async function ensureDatabaseSeeded() {
  try {
    const existing = await prisma.professor.findUnique({
      where: { email: 'professor@liveclass.edu' }
    });

    if (!existing) {
      console.log('🌱 Seeding database on boot for demo professor...');
      const hashedPassword = await bcrypt.hash('password123', 10);
      const professor = await prisma.professor.create({
        data: {
          name: 'Dr. Alan Turing',
          email: 'professor@liveclass.edu',
          password: hashedPassword,
          department: 'Computer Science & Engineering'
        }
      });

      await prisma.quiz.create({
        data: {
          title: 'Computer Networks & Systems Test',
          description: 'Comprehensive mid-term evaluation covering OSI layers, time complexities, socket fundamentals, and string algorithms.',
          professorId: professor.id,
          timeLimit: 30,
          shuffleOptions: false,
          shuffleQuestions: false,
          allowCopyPaste: true,
          showLeaderboardLive: true,
          questions: {
            create: [
              {
                order: 0,
                type: 'MCQ',
                text: 'What is the time complexity of searching for an element in a balanced Binary Search Tree (BST)?',
                marks: 2,
                timeLimit: 25,
                explanation: 'In a balanced BST, the height of the tree is log2(n), leading to O(log n) comparison steps.',
                options: {
                  create: [
                    { text: 'O(n)', isCorrect: false, order: 0 },
                    { text: 'O(log n)', isCorrect: true, order: 1 },
                    { text: 'O(n²)', isCorrect: false, order: 2 },
                    { text: 'O(1)', isCorrect: false, order: 3 }
                  ]
                }
              },
              {
                order: 1,
                type: 'MULTI_MCQ',
                text: 'Which of the following protocols operate at the Transport Layer of the OSI model?',
                marks: 3,
                timeLimit: 30,
                explanation: 'TCP and UDP operate at Layer 4 (Transport Layer).',
                options: {
                  create: [
                    { text: 'TCP (Transmission Control Protocol)', isCorrect: true, order: 0 },
                    { text: 'IP (Internet Protocol)', isCorrect: false, order: 1 },
                    { text: 'UDP (User Datagram Protocol)', isCorrect: true, order: 2 },
                    { text: 'HTTP (Hypertext Transfer Protocol)', isCorrect: false, order: 3 }
                  ]
                }
              },
              {
                order: 2,
                type: 'FILL_BLANK',
                text: 'The time complexity of binary search algorithm on a sorted array of size n is ______.',
                marks: 2,
                timeLimit: 25,
                acceptedAnswers: JSON.stringify(['O(log n)', 'O(logn)', 'log n', 'logn', 'O(log(n))', 'log(n)']),
                explanation: 'Binary search halves the search space at each iteration.'
              },
              {
                order: 3,
                type: 'TRUE_FALSE',
                text: 'TCP (Transmission Control Protocol) is a connection-oriented and reliable byte-stream protocol.',
                marks: 1,
                timeLimit: 20,
                explanation: 'True. TCP establishes a 3-way handshake connection before transmitting data.',
                options: {
                  create: [
                    { text: 'True', isCorrect: true, order: 0 },
                    { text: 'False', isCorrect: false, order: 1 }
                  ]
                }
              },
              {
                order: 4,
                type: 'CODING',
                text: 'Write a program that reads a string from standard input and prints the reversed string to standard output.',
                marks: 5,
                timeLimit: 60,
                codingLanguage: 'python',
                starterCode: `# Reverse a String\nimport sys\n\ndef main():\n    line = sys.stdin.read().strip()\n    print(line[::-1])\n\nif __name__ == '__main__':\n    main()\n`,
                explanation: 'Reversing a string can be achieved using slice notation [::-1].',
                testCases: {
                  create: [
                    { input: 'hello', expectedOutput: 'olleh', isHidden: false, explanation: 'Sample 1' },
                    { input: 'world', expectedOutput: 'dlrow', isHidden: true, explanation: 'Hidden 1' },
                    { input: 'college', expectedOutput: 'egelloc', isHidden: true, explanation: 'Hidden 2' }
                  ]
                }
              },
              {
                order: 5,
                type: 'SHORT_ANSWER',
                text: 'Explain polymorphism in object-oriented programming in one or two sentences.',
                marks: 2,
                timeLimit: 40,
                acceptedAnswers: JSON.stringify(['many forms', 'overriding', 'overloading', 'interface', 'same method']),
                explanation: 'Polymorphism allows objects of different classes to respond to the same interface.'
              }
            ]
          }
        }
      });
      console.log('✅ Auto-seeded database successfully.');
    }
  } catch (err) {
    console.error('[Boot Seed Check Error]', err.message);
  }
}

server.listen(config.port, async () => {
  await ensureDatabaseSeeded();
  console.log(`=========================================`);
  console.log(`🚀 Class Connect Server running on port ${config.port}`);
  console.log(`🌐 Health check: http://localhost:${config.port}/api/health`);
  console.log(`=========================================`);
});
