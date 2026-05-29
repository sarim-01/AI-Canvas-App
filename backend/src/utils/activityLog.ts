import { Server, Socket } from 'socket.io';
import {
  ActivityLogEntry,
  ClientToServerEvents,
  ServerToClientEvents,
} from '../types';

export type ActivityLogLevel = ActivityLogEntry['level'];

function makeEntry(level: ActivityLogLevel, message: string): ActivityLogEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
    level,
    message,
    from: 'server',
  };
}

/** Broadcast a live activity line to all connected clients (and mirror to server console). */
export function broadcastActivityLog(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  level: ActivityLogLevel,
  message: string,
): void {
  const entry = makeEntry(level, message);
  const prefix = level === 'error' ? '[Activity:ERR]' : level === 'warn' ? '[Activity:WARN]' : '[Activity]';
  console.log(`${prefix} ${message}`);
  io.emit('activity:log', entry);
}

/** Send a live activity line to one client only. */
export function emitActivityLogToSocket(
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  level: ActivityLogLevel,
  message: string,
): void {
  const entry = makeEntry(level, message);
  socket.emit('activity:log', entry);
}
