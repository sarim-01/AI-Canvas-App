export type ShapeType = 'circle' | 'rectangle';

export interface CanvasNode {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  radius?: number;
  width?: number;
  height?: number;
  label: string;
  color: string;
}

export type GenerationStatus = 'idle' | 'loading' | 'success' | 'error';

export type LayoutSource = 'off-domain' | 'deterministic' | 'llm' | 'fallback';

export type ActivityLogLevel = 'info' | 'success' | 'warn' | 'error';

export interface ActivityLogEntry {
  id: string;
  ts: number;
  level: ActivityLogLevel;
  message: string;
  from: 'server' | 'client';
}

export interface CanvasStore {
  nodes: CanvasNode[];
  status: GenerationStatus;
  errorMessage: string | null;
  infoMessage: string | null;
  layoutSource: LayoutSource | null;
  activityLogs: ActivityLogEntry[];
  activityLogOpen: boolean;
  canvasRevision: number;
  selectedId: string | null;
  isConnected: boolean;
  serverUrl: string | null;
  setNodes: (nodes: CanvasNode[], source?: LayoutSource | null) => void;
  beginGenerate: () => void;
  moveNode: (id: string, x: number, y: number) => void;
  setStatus: (status: GenerationStatus) => void;
  setError: (msg: string | null) => void;
  setInfo: (msg: string | null) => void;
  setLayoutSource: (source: LayoutSource | null) => void;
  appendActivityLog: (level: ActivityLogLevel, message: string) => void;
  pushServerActivityLog: (entry: ActivityLogEntry) => void;
  clearActivityLogs: () => void;
  setActivityLogOpen: (open: boolean) => void;
  setSelectedId: (id: string | null) => void;
  setConnected: (connected: boolean, serverUrl?: string | null) => void;
  clearCanvas: () => void;
}
