import { useMemo, useState } from 'react';
import { Lightbulb, X } from 'lucide-react';

const HIDE_PREFERENCE_KEY = 'waymark:hide-reflection-prompts';

// Mix of reflection prompts and positive-affect prompts (guideline #4 / #7) —
// purely inspirational, never required, never inserted into the entry text.
const PROMPTS: readonly string[] = Object.freeze([
  "What contributed to this feeling?",
  "What's one good thing from today, even a small one?",
  "Is there a moment from today worth remembering?",
  "What would help you feel a little better right now?",
  "Who or what made today easier?",
  "What's something you're looking forward to?",
  "Did anything today go better than expected?",
  "What's one thing you'd like to remember about today?",
]);

const readHidePreference = (): boolean => {
  try {
    return localStorage.getItem(HIDE_PREFERENCE_KEY) === 'true';
  } catch {
    return false;
  }
};

const persistHidePreference = () => {
  try {
    localStorage.setItem(HIDE_PREFERENCE_KEY, 'true');
  } catch {
    /* ignore */
  }
};

const dayOfYear = (date: Date): number => {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const ReflectionPrompt = () => {
  const [hidden, setHidden] = useState(readHidePreference);
  const [dismissedForNow, setDismissedForNow] = useState(false);

  const prompt = useMemo(() => PROMPTS[dayOfYear(new Date()) % PROMPTS.length], []);

  if (hidden || dismissedForNow) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.5rem',
        padding: '0.6rem 0.75rem',
        marginBottom: '0.75rem',
        borderRadius: 10,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        color: 'var(--text-muted)',
        fontSize: '0.85rem',
        fontStyle: 'italic',
      }}
    >
      <Lightbulb size={16} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
      <span style={{ flex: 1 }}>{prompt}</span>
      <button
        type="button"
        onClick={() => setDismissedForNow(true)}
        aria-label="Dismiss this prompt"
        title="Dismiss"
        style={{
          flexShrink: 0,
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: 2,
          display: 'flex',
        }}
      >
        <X size={14} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => { persistHidePreference(); setHidden(true); }}
        style={{
          flexShrink: 0,
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          fontSize: '0.75rem',
          fontStyle: 'normal',
          textDecoration: 'underline',
          padding: 0,
        }}
      >
        Don't show these
      </button>
    </div>
  );
};

export default ReflectionPrompt;
