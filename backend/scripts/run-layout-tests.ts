/**
 * Layout engine tests (no API key). Run: npm run test:layout
 */
import dotenv from 'dotenv';
import { isOffDomainPrompt, tryBuildDeterministicLayout } from '../src/utils/layoutEngine';

dotenv.config();

const CASES: { id: string; prompt: string; expect: (nodes: { type: string; label: string }[]) => boolean }[] = [
  {
    id: 'S1',
    prompt: 'Create 1 circle in the center labeled A',
    expect: (n) => n.length === 1 && n[0].type === 'circle' && n[0].label === 'A',
  },
  {
    id: 'S2',
    prompt: 'Create 3 circles in a horizontal row',
    expect: (n) => n.length === 3 && n.every((x) => x.type === 'circle'),
  },
  {
    id: 'S3',
    prompt: 'Create 2 rectangles side by side',
    expect: (n) => n.length === 2 && n.every((x) => x.type === 'rectangle'),
  },
  {
    id: 'S4',
    prompt: 'Create 1 circle and 1 rectangle',
    expect: (n) =>
      n.length === 2 &&
      n.filter((x) => x.type === 'circle').length === 1 &&
      n.filter((x) => x.type === 'rectangle').length === 1,
  },
  {
    id: 'M1',
    prompt: 'Create a star layout with 1 center node and 6 surrounding nodes',
    expect: (n) => n.length === 7 && n.every((x) => x.type === 'circle'),
  },
  {
    id: 'M2',
    prompt: 'Create a 3x4 grid of circles labeled A–L',
    expect: (n) => n.length === 12 && n.every((x) => x.type === 'circle'),
  },
  {
    id: 'M3',
    prompt: 'Create 4 rectangles in a row and 1 circle above center',
    expect: (n) =>
      n.length === 5 &&
      n.filter((x) => x.type === 'rectangle').length === 4 &&
      n.filter((x) => x.type === 'circle').length === 1,
  },
  {
    id: 'M4',
    prompt: 'Create 5 circles in a star pattern',
    expect: (n) => n.length === 5 && n.every((x) => x.type === 'circle'),
  },
  {
    id: 'M5',
    prompt: '3 circles and 3 rectangles alternating in a row',
    expect: (n) => {
      if (n.length !== 6) return false;
      const types = n.map((x) => x.type);
      for (let i = 0; i < 6; i++) {
        const want = i % 2 === 0 ? 'circle' : 'rectangle';
        if (types[i] !== want) return false;
      }
      return true;
    },
  },
  {
    id: 'C1',
    prompt: 'Make 20 circles evenly spaced',
    expect: (n) => n.length === 12,
  },
  {
    id: 'A1',
    prompt: 'Create a 2x3 grid of rectangles with labels 1 to 6',
    expect: (n) => n.length === 6 && n.every((x) => x.type === 'rectangle'),
  },
  {
    id: 'A3',
    prompt: 'Create 12 circles labeled A through L in a 3x4 grid',
    expect: (n) => n.length === 12,
  },
  {
    id: 'A4',
    prompt: 'Put a large circle in the center and 4 small circles in the corners',
    expect: (n) => n.length === 5 && n.every((x) => x.type === 'circle'),
  },
  {
    id: 'A5',
    prompt: 'Create 6 rectangles in two rows of 3',
    expect: (n) => n.length === 6 && n.every((x) => x.type === 'rectangle'),
  },
  {
    id: 'C-overmax',
    prompt: 'Make 20 circles',
    expect: (n) => n.length === 12,
  },
  {
    id: 'H1-off',
    prompt: 'xyzzy foobar nonsense gibberish 12345',
    expect: () => true, // must NOT use deterministic
  },
];

function isAlternating(types: string[]): boolean {
  for (let i = 0; i < types.length; i++) {
    const want = i % 2 === 0 ? 'circle' : 'rectangle';
    if (types[i] !== want) return false;
  }
  return true;
}

async function main() {
  let passed = 0;
  let failed = 0;

  console.log('=== Deterministic layout engine (no API) ===\n');

  for (const c of CASES) {
    const det = tryBuildDeterministicLayout(c.prompt);
    const nodes = det ?? [];
    const summary = nodes.map((n) => `${n.type[0]}:${n.label}`).join(' ');

    if (c.id === 'H1-off') {
      if (det === null) {
        console.log(`PASS ${c.id} — off-domain skipped deterministic`);
        passed++;
      } else {
        console.log(`FAIL ${c.id} — should not use deterministic`);
        failed++;
      }
      continue;
    }

    const ok = det !== null && c.expect(nodes);
    if (ok) {
      console.log(`PASS ${c.id} — ${nodes.length} nodes [${summary}]`);
      passed++;
    } else {
      console.log(`FAIL ${c.id} — ${nodes.length} nodes [${summary}]`);
      failed++;
    }
  }

  // M5 alternating check explicit
  const m5 = tryBuildDeterministicLayout('3 circles and 3 rectangles alternating in a row');
  if (m5 && isAlternating(m5.map((n) => n.type))) {
    console.log('PASS M5-alt — strict circle/rect/circle/rect/circle/rect');
    passed++;
  } else {
    console.log('FAIL M5-alt — alternating sequence wrong');
    failed++;
  }

  // M2 grid rows: 3 rows x 4 cols => row spread in y
  const m2 = tryBuildDeterministicLayout('Create a 3x4 grid of circles labeled A–L');
  if (m2 && m2.length === 12) {
    const ys = m2.map((n) => n.y);
    const uniqueY = [...new Set(ys.map((y) => Math.round(y / 20)))].length;
    if (uniqueY === 3) {
      console.log('PASS M2-grid — 3 distinct row bands (3x4)');
      passed++;
    } else {
      console.log(`FAIL M2-grid — expected 3 row bands, got ${uniqueY}`);
      failed++;
    }
  }

  console.log('\n=== Off-domain detection (fallback, no LLM layout) ===\n');
  const OFF_CASES: { id: string; prompt: string; off: boolean }[] = [
    { id: 'OD-laptop', prompt: 'draw a laptop', off: true },
    { id: 'OD-eiffel', prompt: 'show mw eiffle tower', off: true },
    { id: 'OD-25cicles', prompt: '25 cicles', off: true },
    { id: 'OD-make20', prompt: 'Make 20 circles', off: false },
    { id: 'OD-star', prompt: 'Create a star layout with 1 center node and 6 surrounding nodes', off: false },
  ];
  for (const c of OFF_CASES) {
    const got = isOffDomainPrompt(c.prompt);
    if (got === c.off) {
      console.log(`PASS ${c.id} — off-domain=${got}`);
      passed++;
    } else {
      console.log(`FAIL ${c.id} — expected off-domain=${c.off}, got ${got}`);
      failed++;
    }
  }

  console.log(`\n--- ${passed} passed, ${failed} failed ---\n`);

  const hasKey = !!(process.env.AI_API_KEY || process.env.GROQ_API_KEY);
  if (hasKey) {
    console.log('\n=== Live AI smoke (off-domain + labels) ===\n');
    const { convertPromptToNodes } = await import('../src/ai/promptToJson');
    for (const prompt of [
      'xyzzy foobar nonsense gibberish 12345',
      'Tell me a joke about cats',
      'draw a laptop',
      'show mw eiffle tower',
      '25 cicles',
      'Create circles with labels HELLO and WORLD',
    ] as const) {
      try {
        const result = await convertPromptToNodes(prompt);
        const labels = result.nodes.map((n) => n.label).join(',');
        const types = result.nodes.map((n) => n.type[0]).join('');
        const needsFallback =
          isOffDomainPrompt(prompt) ||
          prompt.includes('joke') ||
          prompt.includes('xyzzy');
        const fallbackOk = needsFallback
          ? result.usedFallback && result.nodes.length === 7
          : true;
        const labelOk =
          prompt.includes('HELLO') ? labels.includes('HE') && labels.includes('WO') : true;
        if (!fallbackOk || !labelOk) failed++;
        console.log(
          `  ${prompt.slice(0, 36).padEnd(36)} → n=${result.nodes.length} fb=${!!result.usedFallback} [${types}] ${labels}${!fallbackOk || !labelOk ? ' FAIL' : ''}`,
        );
      } catch (e) {
        console.log(`  FAIL ${prompt.slice(0, 30)} — ${e instanceof Error ? e.message : e}`);
        failed++;
      }
    }
  } else {
    console.log('\nNo API key — skip live AI smoke. UI tests: sync, clear, rate limit, typewriter.');
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
