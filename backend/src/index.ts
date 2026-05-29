import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { registerCanvasHandlers } from './socket/canvasHandlers';
import { canvasStateManager } from './state/canvasState';
import { ClientToServerEvents, ServerToClientEvents } from './types';

const PORT = parseInt(process.env.PORT || '3001', 10);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const aiApiKey = process.env.AI_API_KEY || process.env.GROQ_API_KEY;
if (!aiApiKey) {
  console.error('[Server] AI_API_KEY is not set in backend/.env');
  process.exit(1);
}

const app = express();
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    server: 'node',
    timestamp: new Date().toISOString(),
  });
});

app.get('/state', (_req, res) => {
  res.json(canvasStateManager.getState());
});

const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  registerCanvasHandlers(io, socket);
});

httpServer.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
  console.log(`[Server] Accepting connections from ${FRONTEND_URL}`);
});
