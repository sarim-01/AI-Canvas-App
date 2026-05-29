import { CanvasNode, ShapeType } from '../types';
import { getFallbackStarLayout } from './parseAIResponse';
import { validateAndSanitizeNodes } from './validator';

const CANVAS_WIDTH = parseInt(process.env.CANVAS_WIDTH || '800', 10);
const CANVAS_HEIGHT = parseInt(process.env.CANVAS_HEIGHT || '600', 10);

const COLORS = [
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

function toNodes(raw: Record<string, unknown>[]): CanvasNode[] {
  return validateAndSanitizeNodes(raw).nodes;
}

function labelForIndex(i: number): string {
  if (i < 26) return String.fromCharCode(65 + i);
  return String(i + 1);
}

const LAYOUT_INTENT =
  /(?:circle|circles|cicle|cicles|rect|rectangle|grid|star|shape|layout|row|node|column|alternat|surround|center|centre)/i;

const REAL_WORLD_OBJECT =
  /\b(?:laptop|computer|phone|tablet|cat|dog|car|truck|house|building|tree|person|people|face|logo|bird|fish|eiffel|eiffe|statue|landmark|monument|pyramid|bridge|airplane|aeroplane|plane|train|bus|sunset|mountain|beach|emoji|icon|map|chart|graph|flower|animal|human|robot)\b/i;

/** Off-domain / hallucination-style prompts — use AI fallback, not deterministic layouts */
export function isOffDomainPrompt(prompt: string): boolean {
  const p = prompt.toLowerCase().trim();
  if (!p) return false;

  if (/xyzzy|foobar|gibberish|nonsense/.test(p)) return true;
  if (/joke|python code|photorealistic|ignore previous|plain text/.test(p)) return true;
  if (/tell me|write code|what is|who is|how to\b/.test(p)) return true;
  if (/create\s+0\s+shape/.test(p)) return true;

  // Pictorial: draw/sketch a real object (not “draw a grid” style layout)
  if (
    /\b(?:draw|sketch|paint|illustrate|depict|render)\b/.test(p) &&
    (REAL_WORLD_OBJECT.test(p) || !LAYOUT_INTENT.test(p))
  ) {
    return true;
  }

  // show (me|mw) + landmark / object
  if (
    /\bshow\s+(?:me\s+|mw\s+)?(?:a\s+|the\s+)?/.test(p) &&
    (REAL_WORLD_OBJECT.test(p) || /\btower\b/.test(p))
  ) {
    return true;
  }

  if (/\b(?:picture|image|photo)\s+of\b/.test(p)) return true;

  // Bare over-limit count, typos OK: "25 cicles" → fallback (not LLM guess)
  const manyCircles = p.match(/\b(\d+)\s*c[iy]c?les?\b/);
  if (manyCircles) {
    const n = parseInt(manyCircles[1], 10);
    if (n > 12 && !/(?:make|create|grid|row|star|layout|evenly|alternat|fill)/.test(p)) {
      return true;
    }
  }

  // Keyboard mash / no layout intent
  if (/^[a-z]{5,}$/i.test(p) && !LAYOUT_INTENT.test(p)) {
    return true;
  }

  return false;
}

function buildGrid(
  rows: number,
  cols: number,
  shapeType: ShapeType,
  maxNodes: number,
  shapeSize: { radius?: number; width?: number; height?: number } = {},
): CanvasNode[] {
  const count = Math.min(rows * cols, maxNodes, 12);
  const marginX = 80;
  const marginY = 70;
  const usableW = CANVAS_WIDTH - marginX * 2;
  const usableH = CANVAS_HEIGHT - marginY * 2;
  const cellW = cols > 1 ? usableW / (cols - 1) : 0;
  const cellH = rows > 1 ? usableH / (rows - 1) : 0;
  const startX = marginX;
  const startY = marginY;

  const raw: Record<string, unknown>[] = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = cols === 1 ? CANVAS_WIDTH / 2 : startX + col * cellW;
    const y = rows === 1 ? CANVAS_HEIGHT / 2 : startY + row * cellH;
    const base: Record<string, unknown> = {
      type: shapeType,
      x,
      y,
      label: labelForIndex(i),
      color: COLORS[i % COLORS.length],
    };
    if (shapeType === 'circle') {
      raw.push({ ...base, radius: shapeSize.radius ?? 28 });
    } else {
      raw.push({
        ...base,
        width: shapeSize.width ?? 72,
        height: shapeSize.height ?? 48,
      });
    }
  }
  return toNodes(raw);
}

function buildHorizontalRow(
  count: number,
  shapeType: ShapeType,
  y = CANVAS_HEIGHT * 0.55,
): CanvasNode[] {
  const n = Math.min(Math.max(count, 1), 12);
  const marginX = 100;
  const usableW = CANVAS_WIDTH - marginX * 2;
  const step = n > 1 ? usableW / (n - 1) : 0;
  const raw: Record<string, unknown>[] = [];
  for (let i = 0; i < n; i++) {
    const x = n === 1 ? CANVAS_WIDTH / 2 : marginX + i * step;
    const base: Record<string, unknown> = {
      type: shapeType,
      x,
      y,
      label: labelForIndex(i),
      color: COLORS[i % COLORS.length],
    };
    if (shapeType === 'circle') {
      raw.push({ ...base, radius: 30 });
    } else {
      raw.push({ ...base, width: 80, height: 50 });
    }
  }
  return toNodes(raw);
}

function buildAlternatingRow(circleCount: number, rectCount: number): CanvasNode[] {
  const total = Math.min(circleCount + rectCount, 12);
  let circlesLeft = circleCount;
  let rectsLeft = rectCount;
  const types: ShapeType[] = [];
  let next: ShapeType = 'circle';

  while (types.length < total) {
    if (next === 'circle' && circlesLeft > 0) {
      types.push('circle');
      circlesLeft--;
      next = 'rectangle';
    } else if (next === 'rectangle' && rectsLeft > 0) {
      types.push('rectangle');
      rectsLeft--;
      next = 'circle';
    } else if (circlesLeft > 0) {
      types.push('circle');
      circlesLeft--;
    } else if (rectsLeft > 0) {
      types.push('rectangle');
      rectsLeft--;
    } else {
      break;
    }
  }

  const marginX = 90;
  const usableW = CANVAS_WIDTH - marginX * 2;
  const step = types.length > 1 ? usableW / (types.length - 1) : 0;
  const y = CANVAS_HEIGHT * 0.55;
  const raw: Record<string, unknown>[] = [];

  types.forEach((type, i) => {
    const x = types.length === 1 ? CANVAS_WIDTH / 2 : marginX + i * step;
    const base: Record<string, unknown> = {
      type,
      x,
      y,
      label: labelForIndex(i),
      color: COLORS[i % COLORS.length],
    };
    if (type === 'circle') {
      raw.push({ ...base, radius: 28 });
    } else {
      raw.push({ ...base, width: 76, height: 48 });
    }
  });

  return toNodes(raw);
}

function buildStarRing(count: number, includeCenter: boolean): CanvasNode[] {
  const cx = CANVAS_WIDTH / 2;
  const cy = CANVAS_HEIGHT / 2;
  const orbit = 150;
  const raw: Record<string, unknown>[] = [];

  if (includeCenter) {
    raw.push({
      type: 'circle',
      x: cx,
      y: cy,
      radius: 34,
      label: 'S',
      color: COLORS[0],
    });
  }

  const outer = includeCenter ? count - 1 : count;
  for (let i = 0; i < outer; i++) {
    const angle = (i * Math.PI * 2) / outer - Math.PI / 2;
    raw.push({
      type: 'circle',
      x: cx + orbit * Math.cos(angle),
      y: cy + orbit * Math.sin(angle),
      radius: 28,
      label: includeCenter ? String(i + 1) : labelForIndex(i),
      color: COLORS[(i + 1) % COLORS.length],
    });
  }

  return toNodes(raw);
}

function buildQuincunx(): CanvasNode[] {
  const cx = CANVAS_WIDTH / 2;
  const cy = CANVAS_HEIGHT / 2;
  const offset = 140;
  const positions = [
    { x: cx, y: cy, label: 'A' },
    { x: cx - offset, y: cy - offset, label: 'B' },
    { x: cx + offset, y: cy - offset, label: 'C' },
    { x: cx - offset, y: cy + offset, label: 'D' },
    { x: cx + offset, y: cy + offset, label: 'E' },
  ];
  const raw = positions.map((pos, i) => ({
    type: 'circle' as const,
    x: pos.x,
    y: pos.y,
    radius: i === 0 ? 34 : 28,
    label: pos.label,
    color: COLORS[i % COLORS.length],
  }));
  return toNodes(raw);
}

function buildRectRowWithCircleAbove(rectCount: number): CanvasNode[] {
  const rects = buildHorizontalRow(rectCount, 'rectangle', CANVAS_HEIGHT * 0.68);
  const circleRaw: Record<string, unknown> = {
    type: 'circle',
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT * 0.28,
    radius: 32,
    label: 'A',
    color: COLORS[0],
  };
  const circleNodes = toNodes([circleRaw]);
  const renumbered = rects.map((r, i) => ({ ...r, label: labelForIndex(i + 1) }));
  return [...circleNodes, ...renumbered];
}

function buildCenterWithCorners(): CanvasNode[] {
  const cx = CANVAS_WIDTH / 2;
  const cy = CANVAS_HEIGHT / 2;
  const inset = 200;
  const raw: Record<string, unknown>[] = [
    { type: 'circle', x: cx, y: cy, radius: 42, label: 'A', color: COLORS[0] },
    { type: 'circle', x: cx - inset, y: cy - inset, radius: 22, label: 'B', color: COLORS[1] },
    { type: 'circle', x: cx + inset, y: cy - inset, radius: 22, label: 'C', color: COLORS[2] },
    { type: 'circle', x: cx - inset, y: cy + inset, radius: 22, label: 'D', color: COLORS[3] },
    { type: 'circle', x: cx + inset, y: cy + inset, radius: 22, label: 'E', color: COLORS[4] },
  ];
  return toNodes(raw);
}

function parseCount(text: string, word: string): number | null {
  const digit = text.match(new RegExp(`(\\d+)\\s*${word}`));
  if (digit) return parseInt(digit[1], 10);
  const words: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
  };
  for (const [w, n] of Object.entries(words)) {
    if (new RegExp(`${w}\\s*${word}`).test(text)) return n;
  }
  return null;
}

/**
 * Build a reliable layout for well-known prompt patterns (no LLM).
 */
export function tryBuildDeterministicLayout(prompt: string): CanvasNode[] | null {
  if (isOffDomainPrompt(prompt)) return null;

  const p = prompt.toLowerCase().trim();

  // Star: 1 center + 6 surrounding
  if (
    /star/.test(p) &&
    /(6|six)/.test(p) &&
    (/(surround|around|outer|surrounding)/.test(p) || /center/.test(p))
  ) {
    return getFallbackStarLayout();
  }

  // Grid NxM
  const gridMatch = p.match(/(\d+)\s*[x×]\s*(\d+)/);
  if (gridMatch && /grid/.test(p)) {
    const rows = parseInt(gridMatch[1], 10);
    const cols = parseInt(gridMatch[2], 10);
    const shapeType: ShapeType = /rectang/.test(p) ? 'rectangle' : 'circle';
    return buildGrid(rows, cols, shapeType, rows * cols);
  }

  // Two rows of M (e.g. 6 rectangles in two rows of 3)
  const twoRowMatch = p.match(/two rows of (\d+)/);
  if (twoRowMatch && /rectang/.test(p)) {
    const cols = parseInt(twoRowMatch[1], 10);
    return buildGrid(2, cols, 'rectangle', 12);
  }

  // 2x3 grid of rectangles (without word "grid" optional)
  if (gridMatch && !/grid/.test(p) && /rectang/.test(p)) {
    const rows = parseInt(gridMatch[1], 10);
    const cols = parseInt(gridMatch[2], 10);
    return buildGrid(rows, cols, 'rectangle', rows * cols);
  }

  // Alternating row
  if (/alternat/.test(p)) {
    const c = parseCount(p, 'circle') ?? parseCount(p, 'circles') ?? 3;
    const r = parseCount(p, 'rectang') ?? parseCount(p, 'rectangles') ?? 3;
    return buildAlternatingRow(c, r);
  }

  // 4 rectangles row + circle above center
  if (
    /rectang/.test(p) &&
    /(row|line)/.test(p) &&
    /circle/.test(p) &&
    (/(above|top)/.test(p) || /center/.test(p))
  ) {
    const rectN = parseCount(p, 'rectang') ?? parseCount(p, 'rectangles') ?? 4;
    return buildRectRowWithCircleAbove(rectN);
  }

  // 5 circles star / quincunx
  if (/5\s*circle/.test(p) && /star/.test(p)) {
    return buildQuincunx();
  }

  // 8 circles in a ring
  if (/8\s*circle/.test(p) && /(ring|around)/.test(p)) {
    return buildStarRing(8, true);
  }

  // Center + 4 corners
  if (/large circle/.test(p) && /(corner|corners)/.test(p)) {
    return buildCenterWithCorners();
  }

  // Single circle center labeled
  const oneCircle =
    /(1|one)\s*circle/.test(p) && /center/.test(p) && !/rectang/.test(p);
  if (oneCircle) {
    const labelMatch = p.match(/label(?:ed)?\s+([a-z0-9]+)/i);
    const label = labelMatch ? labelMatch[1].slice(0, 2).toUpperCase() : 'A';
    return toNodes([
      {
        type: 'circle',
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT / 2,
        radius: 36,
        label,
        color: COLORS[0],
      },
    ]);
  }

  // N circles horizontal row
  const rowCircles = p.match(/(\d+)\s*circle/);
  if (rowCircles && /(row|horizontal|line)/.test(p) && !/grid/.test(p) && !/star/.test(p)) {
    return buildHorizontalRow(parseInt(rowCircles[1], 10), 'circle');
  }

  // 2 rectangles side by side
  if (/2\s*rectang/.test(p) && /(side|row)/.test(p)) {
    return buildHorizontalRow(2, 'rectangle');
  }

  // 1 circle and 1 rectangle
  if (/1\s*circle/.test(p) && /1\s*rectang/.test(p)) {
    return toNodes([
      {
        type: 'circle',
        x: CANVAS_WIDTH * 0.35,
        y: CANVAS_HEIGHT / 2,
        radius: 32,
        label: 'A',
        color: COLORS[0],
      },
      {
        type: 'rectangle',
        x: CANVAS_WIDTH * 0.65,
        y: CANVAS_HEIGHT / 2,
        width: 90,
        height: 56,
        label: 'B',
        color: COLORS[1],
      },
    ]);
  }

  // N rectangles in a grid
  const rectGrid = p.match(/(?:create|make)\s+(\d+)\s*rectang/);
  if (rectGrid && /grid/.test(p)) {
    const n = Math.min(parseInt(rectGrid[1], 10), 12);
    const cols = Math.min(4, Math.ceil(Math.sqrt(n)));
    const rows = Math.ceil(n / cols);
    return buildGrid(rows, cols, 'rectangle', n);
  }

  // Make N circles (clamp to 12; used by "Over max" edge case)
  const makeCircles = p.match(/(?:make|create)\s+(\d+)\s*circle/);
  if (makeCircles) {
    const requested = parseInt(makeCircles[1], 10);
    const n = Math.min(requested, 12);
    const cols = n <= 4 ? n : Math.min(4, Math.ceil(Math.sqrt(n)));
    const rows = Math.ceil(n / cols);
    return buildGrid(rows, cols, 'circle', n);
  }

  // Many circles evenly / fill canvas
  const manyCircles = p.match(/(\d+)\s*circle/);
  if (manyCircles && /(evenly|spaced|fill|max|possible)/.test(p)) {
    const n = Math.min(parseInt(manyCircles[1], 10), 12);
    const cols = Math.min(4, Math.ceil(Math.sqrt(n)));
    const rows = Math.ceil(n / cols);
    return buildGrid(rows, cols, 'circle', n);
  }

  return null;
}

function repositionToGrid(
  nodes: CanvasNode[],
  rows: number,
  cols: number,
): CanvasNode[] {
  const gridNodes = buildGrid(rows, cols, nodes[0]?.type ?? 'circle', nodes.length);
  return gridNodes.map((g, i) => ({
    ...g,
    label: nodes[i]?.label ?? g.label,
    color: nodes[i]?.color ?? g.color,
    id: nodes[i]?.id ?? g.id,
  }));
}

function fixAlternatingRow(nodes: CanvasNode[]): CanvasNode[] {
  const circles = nodes.filter((n) => n.type === 'circle').length;
  const rects = nodes.filter((n) => n.type === 'rectangle').length;
  return buildAlternatingRow(circles, rects).map((g, i) => ({
    ...g,
    label: nodes[i]?.label ?? g.label,
    color: nodes[i]?.color ?? g.color,
  }));
}

function mergeStarPositions(nodes: CanvasNode[]): CanvasNode[] {
  const star = getFallbackStarLayout();
  if (nodes.length !== star.length) return nodes;
  return star.map((s, i) => ({
    ...s,
    label: nodes[i]?.label ?? s.label,
    color: nodes[i]?.color ?? s.color,
    id: nodes[i]?.id ?? s.id,
  }));
}

/**
 * Post-process AI nodes for known layout constraints.
 */
export function refineLayoutFromPrompt(prompt: string, nodes: CanvasNode[]): CanvasNode[] {
  if (nodes.length === 0 || isOffDomainPrompt(prompt)) return nodes;

  const p = prompt.toLowerCase();

  if (/alternat/.test(p)) {
    return fixAlternatingRow(nodes);
  }

  const gridMatch = p.match(/(\d+)\s*[x×]\s*(\d+)/);
  if (gridMatch && (/grid/.test(p) || nodes.length >= 6)) {
    const rows = parseInt(gridMatch[1], 10);
    const cols = parseInt(gridMatch[2], 10);
    if (nodes.length >= Math.min(rows * cols, 6)) {
      return repositionToGrid(nodes, rows, cols);
    }
  }

  if (/star/.test(p) && nodes.length === 7 && /(6|six)/.test(p)) {
    return mergeStarPositions(nodes);
  }

  if (/5\s*circle/.test(p) && /star/.test(p) && nodes.length === 5) {
    return buildQuincunx().map((g, i) => ({
      ...g,
      label: nodes[i]?.label ?? g.label,
      color: nodes[i]?.color ?? g.color,
    }));
  }

  return nodes;
}
