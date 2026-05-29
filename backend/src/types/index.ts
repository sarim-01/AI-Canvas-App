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

export interface CanvasState {
  nodes: CanvasNode[];
  updatedAt: number;
}

export interface GeneratePayload {
  prompt: string;
}

export interface MovePayload {
  id: string;
  x: number;
  y: number;
}

export type LayoutSource = 'off-domain' | 'deterministic' | 'llm' | 'fallback';

export interface GeneratedResponse {
  nodes: CanvasNode[];
  fallback?: boolean;
  message?: string;
  source?: LayoutSource;
}

export type ActivityLogLevel = 'info' | 'success' | 'warn' | 'error';

export interface ActivityLogEntry {
  id: string;
  ts: number;
  level: ActivityLogLevel;
  message: string;
  from: 'server' | 'client';
}

export interface ActivityLogPayload extends ActivityLogEntry {}

export interface ErrorResponse {
  error: string;
  code: 'INVALID_PROMPT' | 'AI_FAILED' | 'VALIDATION_FAILED' | 'RATE_LIMITED';
}

export interface ServerToClientEvents {
  'canvas:generated': (data: GeneratedResponse | ErrorResponse) => void;
  'node:moved': (data: MovePayload) => void;
  'canvas:state': (data: CanvasState) => void;
  'activity:log': (data: ActivityLogPayload) => void;
  error: (data: ErrorResponse) => void;
}

export interface ClientToServerEvents {
  'canvas:generate': (data: GeneratePayload) => void;
  'node:move': (data: MovePayload) => void;
  'canvas:request': () => void;
  'canvas:clear': () => void;
}
