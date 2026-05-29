import { CanvasNode } from '../types';
import { validateAndSanitizeNodes } from './validator';

const CANVAS_WIDTH = parseInt(process.env.CANVAS_WIDTH || '800', 10);
const CANVAS_HEIGHT = parseInt(process.env.CANVAS_HEIGHT || '600', 10);

export interface ParseResult {
  nodes: CanvasNode[];
  usedFallback: boolean;
}

function stripMarkdownFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  return trimmed;
}

/** Default 7-node star when AI returns garbage or unparseable output */
export function getFallbackStarLayout(): CanvasNode[] {
  const cx = CANVAS_WIDTH / 2;
  const cy = CANVAS_HEIGHT / 2;
  const orbit = 160;
  const raw: Record<string, unknown>[] = [
    { type: 'circle', x: cx, y: cy, radius: 32, label: 'S', color: '#4F86C6' },
  ];

  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI * 2) / 6 - Math.PI / 2;
    raw.push({
      type: 'circle',
      x: cx + orbit * Math.cos(angle),
      y: cy + orbit * Math.sin(angle),
      radius: 28,
      label: String(i + 1),
      color: ['#E85D75', '#52B788', '#F4A261', '#9B5DE5', '#00BBF9', '#F15BB5'][i],
    });
  }

  return validateAndSanitizeNodes(raw).nodes;
}

/**
 * Parse raw AI text: strip ```json fences, validate, or return fallback star layout.
 * Valid `{"nodes":[]}` returns empty array (not fallback).
 */
export function parseAIResponse(raw: string): ParseResult {
  const cleaned = stripMarkdownFences(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.warn('[AI] JSON parse failed — using fallback star layout');
    return { nodes: getFallbackStarLayout(), usedFallback: true };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { nodes: getFallbackStarLayout(), usedFallback: true };
  }

  const record = parsed as Record<string, unknown>;

  if (!('nodes' in record)) {
    console.warn('[AI] Missing nodes key — using fallback star layout');
    return { nodes: getFallbackStarLayout(), usedFallback: true };
  }

  if (!Array.isArray(record.nodes)) {
    console.warn('[AI] nodes is not an array — using fallback star layout');
    return { nodes: getFallbackStarLayout(), usedFallback: true };
  }

  if (record.nodes.length === 0) {
    return { nodes: [], usedFallback: false };
  }

  const result = validateAndSanitizeNodes(record.nodes);
  if (result.nodes.length === 0) {
    console.warn('[AI] No valid nodes after sanitize — using fallback star layout');
    return { nodes: getFallbackStarLayout(), usedFallback: true };
  }

  if (result.errors.length > 0) {
    console.warn('[AI] Sanitization warnings:', result.errors);
  }

  return { nodes: result.nodes, usedFallback: false };
}
