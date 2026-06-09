import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { MOODS } from '../../utils/moodUtils';
import { MOOD_ICONS, MOOD_ICON_SETS, getIconComponent, type MoodIconSet } from '../../utils/iconRegistry';
import { usePreferences } from '../../hooks/usePreferences';
import IconPicker from '../ui/IconPicker';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import type { MoodValue } from '../../types';

const MoodIconCustomizer = () => {
  const { moodIconOverrides, updateMoodIcons, getMoodIconComponent, DEFAULT_MOOD_ICON_NAMES } = usePreferences();
  const [openPicker, setOpenPicker] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const effectiveIcons: Record<string, string> = {};
  for (let v = 1; v <= 5; v++) {
    effectiveIcons[String(v)] = moodIconOverrides[String(v)] ?? DEFAULT_MOOD_ICON_NAMES[v as MoodValue];
  }

  const isSetActive = (set: MoodIconSet) =>
    Object.keys(set.icons).every(k => effectiveIcons[k] === set.icons[k]);

  const applySet = async (set: MoodIconSet) => {
    setSaving(true);
    try {
      await updateMoodIcons({ ...set.icons });
    } finally {
      setSaving(false);
    }
  };

  const handleIconChange = async (moodValue: number, iconName: string | null) => {
    setSaving(true);
    try {
      const next = { ...moodIconOverrides };
      if (iconName === null) delete next[String(moodValue)];
      else next[String(moodValue)] = iconName;
      await updateMoodIcons(next);
    } finally {
      setSaving(false);
      setOpenPicker(null);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      await updateMoodIcons({});
    } finally {
      setSaving(false);
    }
  };

  const hasOverrides = Object.keys(moodIconOverrides).length > 0;
  const activeSetId = MOOD_ICON_SETS.find(isSetActive)?.id ?? null;

  return (
    <div className="mt-3 flex flex-col gap-5">
      {/* ── Icon set picker ── */}
      <div>
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Icon set
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {MOOD_ICON_SETS.map(set => {
            const active = set.id === activeSetId;
            return (
              <button
                key={set.id}
                type="button"
                disabled={saving}
                onClick={() => void applySet(set)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border p-3 text-left transition-all hover:border-[var(--accent-600)]/50 hover:bg-[var(--bg)] disabled:opacity-50',
                  active
                    ? 'border-[var(--accent-600)] bg-[var(--accent-bg-softer)] ring-1 ring-[var(--accent-600)]/30'
                    : 'border-[var(--border)] bg-[var(--surface)]',
                )}
              >
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map(v => {
                    const mood = MOODS.find(m => m.value === v);
                    const Ic = getIconComponent(set.icons[String(v)]);
                    return (
                      <Ic
                        key={v}
                        size={16}
                        strokeWidth={1.75}
                        style={{ color: mood?.color }}
                      />
                    );
                  })}
                </div>
                <span
                  className={cn(
                    'w-full text-center text-xs leading-tight',
                    active ? 'font-semibold text-[var(--accent-600)]' : 'text-[var(--text-muted)]',
                  )}
                >
                  {set.name}
                </span>
              </button>
            );
          })}
        </div>
        {!activeSetId && (
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Custom — pick a set above or edit individual levels below.
          </p>
        )}
      </div>

      {/* ── Per-level customization ── */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Customize individual levels
        </p>
        <div className="flex flex-col gap-0.5">
          {MOODS.map(mood => {
            const overrideName = moodIconOverrides[String(mood.value)];
            const currentIconName = overrideName ?? DEFAULT_MOOD_ICON_NAMES[mood.value as MoodValue];
            const CurrentIcon = getMoodIconComponent(mood.value);
            const isOpen = openPicker === mood.value;

            return (
              <div key={mood.value} className="flex flex-col">
                <div className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-[var(--bg)]">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                    <CurrentIcon size={28} strokeWidth={1.5} style={{ color: mood.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-[var(--text)]">{mood.label}</span>
                    <span className="ml-2 text-xs text-[var(--text-muted)]">{currentIconName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenPicker(isOpen ? null : mood.value)}
                    className="shrink-0 text-xs text-[var(--accent-600)] transition-colors hover:underline"
                  >
                    {isOpen ? 'Close' : 'Change'}
                  </button>
                </div>
                {isOpen && (
                  <div className="ml-12 mb-2">
                    <IconPicker
                      value={currentIconName}
                      icons={MOOD_ICONS}
                      onChange={name => void handleIconChange(mood.value, name)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {hasOverrides && (
        <Button
          variant="outline"
          onClick={() => void handleReset()}
          disabled={saving}
          className="w-fit gap-2 text-sm"
        >
          <RotateCcw size={14} />
          Reset to defaults
        </Button>
      )}
    </div>
  );
};

export default MoodIconCustomizer;
