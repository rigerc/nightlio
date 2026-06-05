import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { MOODS } from '../../utils/moodUtils';
import { MOOD_ICONS, getIconComponent } from '../../utils/iconRegistry';
import { usePreferences } from '../../contexts/PreferencesContext';
import IconPicker from '../ui/IconPicker';
import { Button } from '../ui/button';

const MoodIconCustomizer = () => {
  const { moodIconOverrides, updateMoodIcons, DEFAULT_MOOD_ICON_NAMES } = usePreferences();
  const [openPicker, setOpenPicker] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const handleIconChange = async (moodValue: number, iconName: string | null) => {
    setSaving(true);
    try {
      const newOverrides = { ...moodIconOverrides };
      if (iconName === null) {
        delete newOverrides[String(moodValue)];
      } else {
        newOverrides[String(moodValue)] = iconName;
      }
      await updateMoodIcons(newOverrides);
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

  return (
    <div className="mt-3">
      <div className="flex flex-col gap-1">
        {MOODS.map(mood => {
          const overrideName = moodIconOverrides[String(mood.value)];
          const currentIconName = overrideName ?? DEFAULT_MOOD_ICON_NAMES[mood.value];
          const CurrentIcon = getIconComponent(currentIconName);
          const isOpen = openPicker === mood.value;
          const isCustomized = Boolean(overrideName);

          return (
            <div key={mood.value} className="flex flex-col">
              <div className="flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-[var(--bg)] transition-colors">
                <div className="shrink-0 w-10 h-10 flex items-center justify-center">
                  <CurrentIcon size={32} strokeWidth={1.5} style={{ color: mood.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-[var(--text)]">{mood.label}</span>
                  {isCustomized && (
                    <span className="ml-2 text-xs text-[var(--text-muted)] italic">{overrideName}</span>
                  )}
                </div>
                <button
                  onClick={() => setOpenPicker(isOpen ? null : mood.value)}
                  className="text-xs text-[var(--accent-600)] hover:underline shrink-0 transition-colors"
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

      {hasOverrides && (
        <Button variant="outline" onClick={() => void handleReset()} disabled={saving} className="mt-3 gap-2 text-sm">
          <RotateCcw size={14} />
          Reset to defaults
        </Button>
      )}
    </div>
  );
};

export default MoodIconCustomizer;
