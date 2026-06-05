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

  const safeIcons = icons.filter(icon => Boolean(icon.component));
  const normalizedSearch = search.trim().toLowerCase();
  const filtered = normalizedSearch
    ? safeIcons.filter(icon => icon.label.toLowerCase().includes(normalizedSearch) || icon.name.toLowerCase().includes(normalizedSearch))
    : safeIcons;

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
      <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-64 overflow-y-auto">
        <button
          type="button"
          onClick={() => onChange(null)}
          title="No icon"
          aria-label="No icon"
          className={cn(
            'flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl transition-colors text-xs text-[var(--text-muted)]',
            !value
              ? 'bg-[var(--accent-bg)] border-2 border-[var(--accent-600)] text-white'
              : 'hover:bg-[var(--bg)] border-2 border-transparent'
          )}
        >
          <X className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={1.8} />
        </button>
        {filtered.map(icon => {
          const IconComp = icon.component;
          const isSelected = value === icon.name;
          return (
            <button
              key={icon.name}
              type="button"
              onClick={() => onChange(icon.name)}
              title={icon.label}
              aria-label={icon.label}
              className={cn(
                'flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl transition-colors',
                isSelected
                  ? 'bg-[var(--accent-bg)] border-2 border-[var(--accent-600)] text-white'
                  : 'hover:bg-[var(--bg)] border-2 border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
              )}
            >
              <IconComp className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={1.75} />
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-5 sm:col-span-6 m-0 px-2 py-3 text-center text-xs text-[var(--text-muted)]">
            No icons found.
          </p>
        )}
      </div>
    </div>
  );
};

export default IconPicker;
