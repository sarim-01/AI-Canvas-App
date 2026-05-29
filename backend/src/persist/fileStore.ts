import fs from 'fs';
import path from 'path';
import { CanvasState } from '../types';

const STORE_PATH = path.join(__dirname, '../../data/canvas.json');

export function loadFromFile(): CanvasState | null {
  try {
    if (!fs.existsSync(STORE_PATH)) return null;
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as CanvasState;
    if (Array.isArray(parsed.nodes)) return parsed;
    return null;
  } catch {
    console.warn('[Persist] Failed to load canvas state from disk');
    return null;
  }
}

export function saveToFile(state: CanvasState): void {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch {
    console.warn('[Persist] Failed to save canvas state to disk');
  }
}
