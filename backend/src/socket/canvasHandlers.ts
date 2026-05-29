import { Server, Socket } from 'socket.io';
import { convertPromptToNodes } from '../ai/promptToJson';
import { canvasStateManager } from '../state/canvasState';
import { ClientToServerEvents, ServerToClientEvents } from '../types';
import { broadcastActivityLog, emitActivityLogToSocket } from '../utils/activityLog';
import { validateMovePayload, validatePrompt } from '../utils/validator';

const generateCooldowns = new Map<string, number>();
const GENERATE_COOLDOWN_MS = 3000;

export function registerCanvasHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
): void {
  console.log(`[Socket] Client connected: ${socket.id}`);
  emitActivityLogToSocket(socket, 'success', `Client connected (${socket.id.slice(0, 8)}…)`);

  socket.on('canvas:request', () => {
    const state = canvasStateManager.getState();
    socket.emit('canvas:state', state);
    emitActivityLogToSocket(
      socket,
      'info',
      `State sent — ${state.nodes.length} shape(s) on canvas`,
    );
  });

  socket.on('canvas:generate', async (data) => {
    const lastCall = generateCooldowns.get(socket.id) ?? 0;
    const now = Date.now();
    if (now - lastCall < GENERATE_COOLDOWN_MS) {
      const msg = 'Rate limited — wait 3s between generates';
      emitActivityLogToSocket(socket, 'warn', msg);
      socket.emit('canvas:generated', {
        error: 'Please wait a moment before generating again',
        code: 'RATE_LIMITED',
      });
      return;
    }
    generateCooldowns.set(socket.id, now);

    const prompt = validatePrompt(data?.prompt);
    if (!prompt) {
      emitActivityLogToSocket(socket, 'warn', 'Generate rejected — empty prompt');
      socket.emit('canvas:generated', {
        error: 'Prompt cannot be empty',
        code: 'INVALID_PROMPT',
      });
      return;
    }

    broadcastActivityLog(io, 'info', `Generate started — "${prompt.slice(0, 60)}${prompt.length > 60 ? '…' : ''}"`);

    try {
      const result = await convertPromptToNodes(prompt);

      if (result.error && result.nodes.length === 0) {
        broadcastActivityLog(io, 'error', `Generate failed — ${result.error}`);
        socket.emit('canvas:generated', {
          error: result.error,
          code: 'AI_FAILED',
        });
        return;
      }

      canvasStateManager.setNodes(result.nodes);
      const source = result.source ?? 'unknown';
      const routeMsg = `route=${source} · ${result.nodes.length} node(s)${result.usedFallback ? ' (fallback)' : ''}`;
      broadcastActivityLog(io, 'success', `Generate complete — ${routeMsg}`);

      io.emit('canvas:generated', {
        nodes: result.nodes,
        ...(result.source && { source: result.source }),
        ...(result.usedFallback && {
          fallback: true,
          message: result.message,
        }),
      });
    } catch (err) {
      console.error('[Socket] Handler error:', err);
      broadcastActivityLog(io, 'error', 'Generate failed — internal server error');
      socket.emit('canvas:generated', {
        error: 'Internal server error',
        code: 'AI_FAILED',
      });
    }
  });

  socket.on('canvas:clear', () => {
    canvasStateManager.clearNodes();
    io.emit('canvas:state', canvasStateManager.getState());
    broadcastActivityLog(io, 'info', 'Canvas cleared — broadcast to all tabs');
  });

  socket.on('node:move', (data) => {
    if (!validateMovePayload(data)) {
      emitActivityLogToSocket(socket, 'warn', 'Move rejected — invalid payload');
      return;
    }

    const moved = canvasStateManager.moveNode(data.id, data.x, data.y);
    if (!moved) {
      emitActivityLogToSocket(socket, 'warn', `Move failed — unknown node ${data.id}`);
      return;
    }

    socket.broadcast.emit('node:moved', {
      id: data.id,
      x: data.x,
      y: data.y,
    });
  });

  socket.on('disconnect', () => {
    generateCooldowns.delete(socket.id);
    console.log(`[Socket] Client disconnected: ${socket.id}`);
    broadcastActivityLog(io, 'info', `Client disconnected (${socket.id.slice(0, 8)}…)`);
  });
}
