import { useCallback, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useCanvasStore } from '../store/useCanvasStore';
import { ActivityLogEntry, CanvasNode, LayoutSource } from '../types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

let socketInstance: Socket | null = null;

function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    });
  }
  return socketInstance;
}

export function useSocket() {
  const socket = useRef<Socket>(getSocket());
  const {
    setNodes,
    moveNode,
    setError,
    setInfo,
    setConnected,
    clearCanvas,
    beginGenerate,
    appendActivityLog,
    pushServerActivityLog,
  } = useCanvasStore();

  useEffect(() => {
    const s = socket.current;

    const onConnect = () => {
      console.log('[Socket] Connected to Node server:', s.id);
      setConnected(true, SOCKET_URL);
      setError(null);
      appendActivityLog('success', `Connected to Node.js (${SOCKET_URL})`);
      s.emit('canvas:request');
    };

    const onDisconnect = (reason: string) => {
      console.warn('[Socket] Disconnected:', reason);
      setConnected(false);
      appendActivityLog('warn', `Disconnected — ${reason}`);
    };

    const onConnectError = (err: Error) => {
      console.error('[Socket] Connection error:', err.message);
      setConnected(false);
      appendActivityLog('error', `Connection failed — ${err.message}`);
      setError(
        'Not connected to Node.js server. Run: cd backend && npm run dev (port 3001)',
      );
    };

    const onCanvasState = (data: { nodes?: CanvasNode[] }) => {
      if (!Array.isArray(data.nodes)) return;
      if (data.nodes.length === 0) {
        clearCanvas();
        appendActivityLog('info', 'Canvas state — empty');
      } else {
        setNodes(data.nodes);
        appendActivityLog('info', `Canvas state loaded — ${data.nodes.length} shape(s)`);
      }
    };

    const onCanvasGenerated = (data: {
      nodes?: CanvasNode[];
      error?: string;
      fallback?: boolean;
      message?: string;
      source?: LayoutSource;
    }) => {
      if ('error' in data && data.error && !Array.isArray(data.nodes)) {
        appendActivityLog('error', `Generate error — ${data.error}`);
        setError(data.error);
        return;
      }
      if (Array.isArray(data.nodes)) {
        const src = data.source ?? (data.fallback ? 'fallback' : 'llm');
        setNodes(data.nodes, src);
        appendActivityLog(
          'success',
          `Layout received — ${data.nodes.length} shape(s) · ${src}`,
        );
        if (data.fallback && data.message) {
          setInfo(data.message);
        }
      }
    };

    const onNodeMoved = (data: { id: string; x: number; y: number }) => {
      moveNode(data.id, data.x, data.y);
      appendActivityLog('info', `Sync — shape moved (${data.id.slice(0, 12)}…)`);
    };

    const onActivityLog = (entry: ActivityLogEntry) => {
      pushServerActivityLog(entry);
    };

    const onError = (data: { error?: string }) => {
      appendActivityLog('error', data.error ?? 'Server error');
      setError(data.error ?? 'Server error');
    };

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('connect_error', onConnectError);
    s.on('canvas:state', onCanvasState);
    s.on('canvas:generated', onCanvasGenerated);
    s.on('node:moved', onNodeMoved);
    s.on('activity:log', onActivityLog);
    s.on('error', onError);

    if (s.connected) {
      onConnect();
    }

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('connect_error', onConnectError);
      s.off('canvas:state', onCanvasState);
      s.off('canvas:generated', onCanvasGenerated);
      s.off('node:moved', onNodeMoved);
      s.off('activity:log', onActivityLog);
      s.off('error', onError);
    };
  }, [
    setNodes,
    moveNode,
    setError,
    setInfo,
    setConnected,
    clearCanvas,
    beginGenerate,
    appendActivityLog,
    pushServerActivityLog,
  ]);

  const generateCanvas = useCallback(
    (prompt: string) => {
      if (!socket.current.connected) {
        setError('Not connected to Node.js server');
        return;
      }
      beginGenerate();
      appendActivityLog('info', `Generate requested — "${prompt.slice(0, 50)}${prompt.length > 50 ? '…' : ''}"`);
      socket.current.emit('canvas:generate', { prompt });
    },
    [beginGenerate, setError, appendActivityLog],
  );

  const emitMove = useCallback((id: string, x: number, y: number) => {
    socket.current.emit('node:move', { id, x, y });
  }, []);

  const clearCanvasRemote = useCallback(() => {
    if (!socket.current.connected) return;
    clearCanvas();
    appendActivityLog('info', 'Clear canvas requested');
    socket.current.emit('canvas:clear');
  }, [clearCanvas, appendActivityLog]);

  return { generateCanvas, emitMove, clearCanvasRemote };
};
