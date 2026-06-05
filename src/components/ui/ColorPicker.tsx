import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
  '#64748b', '#6b7280', '#a16207', '#065f46',
];

interface ColorPickerProps {
  value: string | null | undefined;
  onChange: (color: string | null) => void;
  nullable?: boolean;
}

const ColorPicker = ({ value, onChange, nullable = false }: ColorPickerProps) => {
  return (
    <div className="flex flex-wrap gap-1.5">
      {nullable && (
        <button
          onClick={() => onChange(null)}
          title="No color"
          className={cn(
            'w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all',
            !value
              ? 'border-[var(--accent-600)] scale-110'
              : 'border-[var(--border)] hover:border-[var(--text-muted)]',
            'bg-[var(--surface)] text-[var(--text-muted)]'
          )}
        >
          <X size={12} />
        </button>
      )}
      {PRESET_COLORS.map(color => (
        <button
          key={color}
          onClick={() => onChange(color)}
          title={color}
          className={cn(
            'w-7 h-7 rounded-full border-2 transition-all',
            value === color
              ? 'border-[var(--text)] scale-110 shadow-sm'
              : 'border-transparent hover:scale-105'
          )}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
};

export default ColorPicker;
