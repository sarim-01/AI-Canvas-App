import { create } from 'zustand';
import {
  ActivityLogEntry,
  ActivityLogLevel,
  CanvasNode,
  CanvasStore,
  GenerationStatus,
  LayoutSource,
} from '../types';

const MAX_ACTIVITY_LOGS = 80;

function makeClientLog(level: ActivityLogLevel, message: string): ActivityLogEntry {
  return {
    id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
    level,
    message,
    from: 'client',
  };
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  nodes: [],
  status: 'idle',
  errorMessage: null,
  infoMessage: null,
  layoutSource: null,
  activityLogs: [],
  activityLogOpen: false,
  canvasRevision: 0,
  selectedId: null,
  isConnected: false,
  serverUrl: null,

  setNodes: (nodes: CanvasNode[], layoutSource: LayoutSource | null = null) =>
    set((state) => ({
      nodes,
      status: 'success',
      errorMessage: null,
      infoMessage: null,
      layoutSource,
      canvasRevision: state.canvasRevision + 1,
    })),

  beginGenerate: () =>
    set((state) => ({
      nodes: [],
      selectedId: null,
      layoutSource: null,
      status: 'loading',
      errorMessage: null,
      infoMessage: null,
      canvasRevision: state.canvasRevision + 1,
    })),

  setLayoutSource: (layoutSource: LayoutSource | null) => set({ layoutSource }),

  appendActivityLog: (level, message) =>
    set((state) => ({
      activityLogs: [...state.activityLogs, makeClientLog(level, message)].slice(-MAX_ACTIVITY_LOGS),
    })),

  pushServerActivityLog: (entry) =>
    set((state) => ({
      activityLogs: [...state.activityLogs, entry].slice(-MAX_ACTIVITY_LOGS),
    })),

  clearActivityLogs: () => set({ activityLogs: [] }),

  setActivityLogOpen: (activityLogOpen) => set({ activityLogOpen }),

  moveNode: (id: string, x: number, y: number) =>
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
    })),

  setStatus: (status: GenerationStatus) => set({ status }),

  setError: (errorMessage: string | null) =>
    set({ status: 'error', errorMessage, infoMessage: null }),

  setInfo: (infoMessage: string | null) =>
    set({ infoMessage, status: 'success', errorMessage: null }),

  setSelectedId: (selectedId: string | null) => set({ selectedId }),

  setConnected: (isConnected: boolean, serverUrl: string | null = null) =>
    set({ isConnected, serverUrl: isConnected ? serverUrl : null }),

  clearCanvas: () =>
    set((state) => ({
      nodes: [],
      status: 'idle',
      errorMessage: null,
      infoMessage: null,
      layoutSource: null,
      selectedId: null,
      canvasRevision: state.canvasRevision + 1,
    })),
}));
