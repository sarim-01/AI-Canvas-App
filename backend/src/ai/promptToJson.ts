import Groq from 'groq-sdk';
import { CanvasNode } from '../types';
import {
  isOffDomainPrompt,
  refineLayoutFromPrompt,
  tryBuildDeterministicLayout,
} from '../utils/layoutEngine';
import { LayoutSource } from '../types';
import { getFallbackStarLayout, parseAIResponse } from '../utils/parseAIResponse';

function logRoute(source: LayoutSource, nodeCount: number, detail?: string) {
  const extra = detail ? ` — ${detail}` : '';
  console.log(`[AI] route=${source} nodes=${nodeCount}${extra}`);
}

function getGroqClient(): Groq {
  const apiKey = process.env.AI_API_KEY || process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('AI_API_KEY or GROQ_API_KEY is not set');
  }
  return new Groq({ apiKey });
}

const SYSTEM_PROMPT = `You are a canvas layout engine that converts user descriptions into geometric shapes.

RULES (MUST follow exactly):
1. Return ONLY a raw JSON object. No markdown, no code fences, no explanation, no preamble.
2. JSON schema: { "nodes": [ ...shapes ] }
3. Each shape must have EXACTLY these fields:
   - "type": "circle" or "rectangle" (no other values)
   - "x": number (0-800, center point)
   - "y": number (0-600, center point)
   - "label": string (MAX 2 characters, alphanumeric only e.g. "A", "1", "AB")
   - "color": hex color string e.g. "#4F86C6"
   - For circle ONLY: "radius": number (15-60)
   - For rectangle ONLY: "width": number (40-120), "height": number (30-80)
4. Canvas is 800x600 pixels. All shapes must fit entirely inside.
5. Maximum 12 nodes total. Never exceed this.
6. Distribute shapes to avoid overlap.
7. Use visually appealing, distinct colors per shape or group.
8. If prompt is nonsensical or cannot be rendered as shapes, return: { "nodes": [], "error": "Cannot render this as shapes" }

LAYOUT EXAMPLES:
- "star layout 1 center + 6 surrounding": place 1 at (400,300), 6 at radius ~160 around it
- "3x4 grid": evenly distribute in rows/cols across canvas
- "row of 4": space horizontally with even gaps
- "circle above center": circle at (400,150), shapes below at y>300`;

export interface ConvertResult {
  nodes: CanvasNode[];
  error?: string;
  usedFallback?: boolean;
  message?: string;
  source?: LayoutSource;
}

export async function convertPromptToNodes(prompt: string): Promise<ConvertResult> {
  if (isOffDomainPrompt(prompt)) {
    const nodes = getFallbackStarLayout();
    logRoute('off-domain', nodes.length);
    return {
      nodes,
      usedFallback: true,
      source: 'off-domain',
      message:
        'This prompt is not a layout description (grids, rows, stars). Showing default star layout.',
    };
  }

  const deterministic = tryBuildDeterministicLayout(prompt);
  if (deterministic && deterministic.length > 0) {
    logRoute('deterministic', deterministic.length);
    return { nodes: deterministic, source: 'deterministic' };
  }

  try {
    const completion = await getGroqClient().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Create a canvas layout for: "${prompt}"` },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const rawText = completion.choices[0]?.message?.content?.trim() ?? '';

    if (!rawText) {
      const nodes = getFallbackStarLayout();
      logRoute('fallback', nodes.length, 'empty LLM response');
      return {
        nodes,
        usedFallback: true,
        source: 'fallback',
        message: 'AI returned empty response — showing default star layout',
      };
    }

    const parsed = parseAIResponse(rawText);

    if (parsed.usedFallback) {
      logRoute('fallback', parsed.nodes.length, 'unparseable JSON');
      return {
        nodes: parsed.nodes,
        usedFallback: true,
        source: 'fallback',
        message: 'Could not parse AI output — showing default star layout (7 circles)',
      };
    }

    if (parsed.nodes.length === 0) {
      const nodes = getFallbackStarLayout();
      logRoute('fallback', nodes.length, 'empty nodes array from model');
      return {
        nodes,
        usedFallback: true,
        source: 'fallback',
        message: 'Prompt could not be rendered — showing default star layout',
      };
    }

    const refined = refineLayoutFromPrompt(prompt, parsed.nodes);
    logRoute('llm', refined.length);
    return { nodes: refined, source: 'llm' };
  } catch (err) {
    console.error('[AI] API error:', err);
    const message = err instanceof Error ? err.message : 'Unknown AI error';
    const nodes = getFallbackStarLayout();
    logRoute('fallback', nodes.length, `API error: ${message}`);
    return {
      nodes,
      usedFallback: true,
      source: 'fallback',
      message: `AI service error — showing default layout (${message})`,
    };
  }
}
