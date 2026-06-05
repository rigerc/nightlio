import { MOODS } from '../../utils/moodUtils';
import { usePreferences } from '../../contexts/PreferencesContext';

const MoodDisplay = ({ moodValue, size = 32, showLabel = true, children = null }) => {
  const mood = MOODS.find(m => m.value === moodValue);
  const { getMoodIconComponent } = usePreferences();

  if (!mood) return null;

  const IconComponent = getMoodIconComponent(moodValue);
  const isIconOnly = !showLabel;

  return (
    <div
      className={`flex items-center bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm ${children ? 'justify-between' : 'justify-center'} ${isIconOnly ? 'gap-3 px-3.5 py-3' : 'gap-4 p-4'}`}
    >
      {children && (
        <div className="flex items-center min-w-0 flex-1">
          {children}
        </div>
      )}
      <div
        className={`flex items-center shrink-0 ${showLabel ? 'gap-4' : 'gap-0'} ${children ? 'ml-auto' : ''}`}
      >
        <IconComponent
          size={isIconOnly ? Math.max(24, size - 2) : size}
          strokeWidth={1.5}
          style={{ color: mood.color }}
        />
        {showLabel && (
          <span className="text-xl font-semibold" style={{ color: mood.color }}>
            Feeling {mood.label}
          </span>
        )}
      </div>
    </div>
  );
};

export default MoodDisplay;
