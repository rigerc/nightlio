import { getIconComponent } from '../../utils/iconRegistry';
import type { SliderValue } from '../../types';

interface SliderValueBarProps {
  sliderValue: SliderValue;
}

const SliderValueBar = ({ sliderValue }: SliderValueBarProps) => {
  const { group_name, group_color, group_icon, value, slider_min, slider_max } = sliderValue;
  const IconComp = group_icon ? getIconComponent(group_icon) : null;
  const range = slider_max - slider_min;
  const pct = range > 0 ? ((value - slider_min) / range) * 100 : 100;
  const color = group_color ?? 'var(--accent-600)';

  return (
    <div className="flex items-center gap-2.5">
      {IconComp && <IconComp className="w-4 h-4 shrink-0" strokeWidth={1.75} style={{ color }} />}
      <span className="text-sm font-medium shrink-0" style={{ color }}>{group_name}</span>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: color + '20' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

export default SliderValueBar;
