import { MOODS } from '../../utils/moodUtils';
import { usePreferences } from '../../hooks/usePreferences';
import type { MoodValue } from '../../types';
import './MoodPicker.css';

interface MoodPickerProps {
  onMoodSelect: (mood: MoodValue) => void;
}

const MoodPicker = ({ onMoodSelect }: MoodPickerProps) => {
  const { getMoodIconComponent } = usePreferences();

  return (
    <div className="mood-grid">
      {MOODS.map(mood => {
        const IconComponent = getMoodIconComponent(mood.value);
        return (
          <button
            key={mood.value}
            onClick={() => onMoodSelect(mood.value)}
            className="mood-button"
            style={{ color: mood.color }}
            title={mood.label}
          >
            <IconComponent size={40} strokeWidth={1.5} />
          </button>
        );
      })}
    </div>
  );
};

export default MoodPicker;
