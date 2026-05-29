import { CanvasNode, ShapeType } from '../types';

const CANVAS_WIDTH = parseInt(process.env.CANVAS_WIDTH || '800', 10);
const CANVAS_HEIGHT = parseInt(process.env.CANVAS_HEIGHT || '600', 10);
const MAX_NODES = 12;
const MAX_LABEL_LENGTH = 2;
const MIN_RADIUS = 10;
const MAX_RADIUS = 80;
const MIN_SIZE = 20;
const MAX_WIDTH = 160;
const MAX_HEIGHT = 120;
const DEFAULT_COLORS = [
  '#4F86C6',
  '#E85D75',
  '#52B788',
  '#F4A261',
  '#9B5DE5',
  '#00BBF9',
  '#F15BB5',
  '#FEE440',
  '#00F5D4',
  '#FB5607',
  '#3A0CA3',
  '#4CC9F0',
];

const VALID_TYPES: ShapeType[] = ['circle', 'rectangle'];

export interface ValidationResult {
  valid: boolean;
  nodes: CanvasNode[];
  errors: string[];
}

export function validateAndSanitizeNodes(raw: unknown[]): ValidationResult {
  const errors: string[] = [];
  const valid: CanvasNode[] = [];

  if (!Array.isArray(raw)) {
    return { valid: false, nodes: [], errors: ['nodes must be an array'] };
  }

  const limited = raw.slice(0, MAX_NODES);
  if (raw.length > MAX_NODES) {
    errors.push(`Clamped ${raw.length} nodes to max ${MAX_NODES}`);
  }

  limited.forEach((item: unknown, idx: number) => {
    if (typeof item !== 'object' || item === null) {
      errors.push(`Node ${idx}: not an object`);
      return;
    }

    const n = item as Record<string, unknown>;
    const typeRaw = String(n.type ?? 'circle').toLowerCase();
    const type: ShapeType = typeRaw === 'rectangle' ? 'rectangle' : 'circle';

    const rawX = typeof n.x === 'number' && !Number.isNaN(n.x) ? n.x : Number(n.x);
    const rawY = typeof n.y === 'number' && !Number.isNaN(n.y) ? n.y : Number(n.y);
    const xNum = Number.isNaN(rawX) ? 200 : rawX;
    const yNum = Number.isNaN(rawY) ? 200 : rawY;

    const padding = 60;
    const x = Math.min(Math.max(xNum, padding), CANVAS_WIDTH - padding);
    const y = Math.min(Math.max(yNum, padding), CANVAS_HEIGHT - padding);

    let rawLabel: string;
    if (n.label === undefined || n.label === null || n.label === '') {
      rawLabel = String(idx + 1);
    } else {
      rawLabel = String(n.label);
    }
    const label =
      rawLabel.replace(/[^A-Za-z0-9]/g, '').slice(0, MAX_LABEL_LENGTH) ||
      String(idx + 1).slice(0, 2);

    const color =
      typeof n.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(n.color)
        ? n.color
        : DEFAULT_COLORS[idx % DEFAULT_COLORS.length];

    if (type === 'circle') {
      const r =
        typeof n.radius === 'number' && !Number.isNaN(n.radius) ? n.radius : Number(n.radius);
      const radius = Number.isNaN(r)
        ? 30
        : Math.min(Math.max(r, MIN_RADIUS), MAX_RADIUS);

      valid.push({
        id: `node-${Date.now()}-${idx}`,
        type,
        x,
        y,
        radius,
        label,
        color,
      });
    } else {
      const width =
        typeof n.width === 'number'
          ? Math.min(Math.max(n.width, MIN_SIZE), MAX_WIDTH)
          : 80;
      const height =
        typeof n.height === 'number'
          ? Math.min(Math.max(n.height, MIN_SIZE), MAX_HEIGHT)
          : 50;

      valid.push({
        id: `node-${Date.now()}-${idx}`,
        type,
        x,
        y,
        width,
        height,
        label,
        color,
      });
    }
  });

  return { valid: valid.length > 0, nodes: valid, errors };
}

export function validateMovePayload(data: unknown): data is { id: string; x: number; y: number } {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.id === 'string' &&
    typeof d.x === 'number' &&
    typeof d.y === 'number' &&
    d.x >= 0 &&
    d.x <= CANVAS_WIDTH &&
    d.y >= 0 &&
    d.y <= CANVAS_HEIGHT
  );
}

export function validatePrompt(prompt: unknown): string | null {
  if (typeof prompt !== 'string') return null;
  const trimmed = prompt.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 500) return trimmed.slice(0, 500);
  return trimmed;
}
