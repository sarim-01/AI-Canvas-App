/** Must match backend validator MAX_NODES */
export const MAX_NODES = 12;

export type LayoutSource = 'off-domain' | 'deterministic' | 'llm' | 'fallback';

export const LAYOUT_SOURCE_LABELS: Record<LayoutSource, string> = {
  'off-domain': 'Off-domain → fallback',
  deterministic: 'Deterministic geometry',
  llm: 'AI (Groq LLM)',
  fallback: 'Parse fallback',
};
