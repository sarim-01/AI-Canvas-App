import React, { useCallback, useRef, useState } from 'react';
import { MAX_NODES } from '../constants';
import { useTypewriter } from '../hooks/useTypewriter';
import { useCanvasStore } from '../store/useCanvasStore';

/** Rotating hints shown with typewriter animation when the input is empty */
const TYPEWRITER_PHRASES = [
  'What would you like to build today?',
  'Create a star layout with 1 center node and 6 surrounding nodes',
  'Create a 3x4 grid of circles labeled A–L',
  'Create 4 rectangles in a row and 1 circle above center',
  '3 circles and 3 rectangles alternating in a row',
];

const PRESET_LAYOUTS = [
  {
    icon: '★',
    label: 'Star',
    prompt: 'Create a star layout with 1 center node and 6 surrounding nodes',
  },
  {
    icon: '▦',
    label: '3×4 Grid',
    prompt: 'Create a 3x4 grid of circles labeled A–L',
  },
  {
    icon: '▤',
    label: 'Row + circle',
    prompt: 'Create 4 rectangles in a row and 1 circle above center',
  },
  {
    icon: '◐',
    label: 'Alternating',
    prompt: '3 circles and 3 rectangles alternating in a row',
  },
];

const EDGE_CASE_PROMPTS = [
  {
    label: 'Nonsense text',
    prompt: 'xyzzy foobar nonsense gibberish 12345',
  },
  {
    label: 'Empty-style request',
    prompt: 'Create 0 shapes',
  },
  {
    label: 'Over max (20 circles)',
    prompt: 'Make 20 circles',
  },
];

interface PromptInputProps {
  onGenerate: (prompt: string) => void;
  onClear: () => void;
}

export const PromptInput: React.FC<PromptInputProps> = ({ onGenerate, onClear }) => {
  const [prompt, setPrompt] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const { status, errorMessage, infoMessage, nodes, isConnected } = useCanvasStore();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const showTypewriter = prompt.length === 0 && !isFocused && isConnected && status !== 'loading';
  const typewriterText = useTypewriter(TYPEWRITER_PHRASES, showTypewriter);

  const isLoading = status === 'loading';
  const canSubmit = prompt.trim().length > 0 && !isLoading && isConnected;
  const canClear = isConnected && !isLoading && nodes.length > 0;

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!canSubmit) return;
      onGenerate(prompt.trim());
    },
    [prompt, canSubmit, onGenerate],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      inputRef.current?.blur();
    }
  };

  return (
    <div className="prompt">
      <div className="prompt__row">
        <div className="prompt__field-wrap">
          {showTypewriter && (
            <div className="prompt__typewriter" aria-hidden>
              <span>{typewriterText}</span>
              <span className="prompt__typewriter-cursor">|</span>
            </div>
          )}
          <textarea
            ref={inputRef}
            className="prompt__textarea"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder=""
            disabled={isLoading || !isConnected}
            rows={2}
            aria-label="Describe a canvas layout"
          />
          <button
            type="button"
            className="prompt__submit"
            onClick={() => handleSubmit()}
            disabled={!canSubmit}
            title="Generate (Enter)"
            aria-label="Generate layout"
          >
            {isLoading ? <span className="spinner" /> : '→'}
          </button>
        </div>
        <button
          type="button"
          className="prompt__clear"
          onClick={onClear}
          disabled={!canClear}
          title="Clear canvas for all tabs"
        >
          Clear
        </button>
      </div>

      {!isConnected && (
        <div className="alert alert--error">
          <strong>Node.js server not connected.</strong> Start the backend:{' '}
          <code>cd backend && npm run dev</code> — then refresh this page. Header should show
          &quot;Node.js connected&quot;.
        </div>
      )}

      {status === 'loading' && (
        <div className="alert alert--loading">
          <span className="spinner" />
          Generating layout with AI…
        </div>
      )}

      {infoMessage && <div className="alert alert--info">{infoMessage}</div>}

      {status === 'error' && errorMessage && (
        <div className="alert alert--error">{errorMessage}</div>
      )}

      {status === 'success' && nodes.length > 0 && (
        <div className="alert alert--success">
          {nodes.length} / {MAX_NODES} shape{nodes.length !== 1 ? 's' : ''} on canvas — drag to
          reposition · click a shape to select
        </div>
      )}

      <div>
        <div className="prompt__examples-label">Quick layouts</div>
        <div className="prompt__chips">
          {PRESET_LAYOUTS.map(({ icon, label, prompt: presetPrompt }) => (
            <button
              key={presetPrompt}
              type="button"
              className="chip chip--preset"
              onClick={() => {
                if (nodes.length > 0) onClear();
                setPrompt(presetPrompt);
                inputRef.current?.focus();
              }}
              disabled={isLoading || !isConnected}
              title={presetPrompt}
            >
              <span className="chip__icon" aria-hidden>
                {icon}
              </span>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="prompt__examples-label prompt__examples-label--edge">
          Edge case tests
        </div>
        <div className="prompt__chips">
          {EDGE_CASE_PROMPTS.map(({ label, prompt: edgePrompt }) => (
            <button
              key={edgePrompt}
              type="button"
              className="chip chip--edge"
              onClick={() => {
                if (nodes.length > 0) onClear();
                setPrompt(edgePrompt);
                inputRef.current?.focus();
              }}
              disabled={isLoading || !isConnected}
              title={edgePrompt}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
