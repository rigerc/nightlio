import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { AVAILABLE_ICONS } from '../../utils/iconRegistry';
import type { IconEntry } from '../../utils/iconRegistry';
import { cn } from '../../lib/utils';

interface IconPickerProps {
  value: string | null | undefined;
  onChange: (name: string | null) => void;
  icons?: IconEntry[];
  className?: string;
}

const IconPicker = ({ value, onChange, icons = AVAILABLE_ICONS, className = '' }: IconPickerProps) => {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? icons.filter(i => i.label.toLowerCase().includes(search.toLowerCase()) || i.name.toLowerCase().includes(search.toLowerCase()))
    : icons;

  return (
    <div className={cn('bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 shadow-md', className)}>
      <div className="relative mb-2">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder="Search icons…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 text-sm bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)] outline-none focus:border-[var(--accent-600)] transition-colors"
        />
      </div>
      <div className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto">
        <button
          onClick={() => onChange(null)}
          title="No icon"
          className={cn(
            'flex items-center justify-center w-9 h-9 rounded-lg transition-colors text-xs text-[var(--text-muted)]',
            !value
              ? 'bg-[var(--accent-bg)] border-2 border-[var(--accent-600)]'
              : 'hover:bg-[var(--bg)] border-2 border-transparent'
          )}
        >
          <X size={14} />
        </button>
        {filtered.map(icon => {
          const IconComp = icon.component;
          const isSelected = value === icon.name;
          return (
            <button
              key={icon.name}
              onClick={() => onChange(icon.name)}
              title={icon.label}
              className={cn(
                'flex items-center justify-center w-9 h-9 rounded-lg transition-colors',
                isSelected
                  ? 'bg-[var(--accent-bg)] border-2 border-[var(--accent-600)] text-[var(--accent-600)]'
                  : 'hover:bg-[var(--bg)] border-2 border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
              )}
            >
              <IconComp size={18} strokeWidth={1.5} />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default IconPicker;
