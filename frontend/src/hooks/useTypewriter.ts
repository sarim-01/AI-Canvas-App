import { useEffect, useState } from 'react';

const TYPE_MS = 48;
const DELETE_MS = 28;
const PAUSE_TYPED_MS = 2200;
const PAUSE_DELETED_MS = 500;

/**
 * Cycles phrases with type → pause → backspace → next (ChatGPT-style prompt hint).
 */
export function useTypewriter(phrases: string[], active: boolean): string {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [text, setText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!active || phrases.length === 0) {
      setText('');
      return;
    }

    const phrase = phrases[phraseIndex % phrases.length];
    let timeout: ReturnType<typeof setTimeout>;

    if (!deleting && text.length < phrase.length) {
      timeout = setTimeout(() => {
        setText(phrase.slice(0, text.length + 1));
      }, TYPE_MS);
    } else if (!deleting && text.length === phrase.length) {
      timeout = setTimeout(() => setDeleting(true), PAUSE_TYPED_MS);
    } else if (deleting && text.length > 0) {
      timeout = setTimeout(() => {
        setText(phrase.slice(0, text.length - 1));
      }, DELETE_MS);
    } else {
      timeout = setTimeout(() => {
        setDeleting(false);
        setPhraseIndex((i) => (i + 1) % phrases.length);
      }, PAUSE_DELETED_MS);
    }

    return () => clearTimeout(timeout);
  }, [active, phrases, phraseIndex, text, deleting]);

  useEffect(() => {
    if (!active) {
      setPhraseIndex(0);
      setDeleting(false);
      setText('');
    }
  }, [active]);

  return text;
}
