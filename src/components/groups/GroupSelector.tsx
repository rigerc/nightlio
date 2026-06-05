import { cn } from '../../lib/utils';
import { getIconComponent } from '../../utils/iconRegistry';
import type { Group } from '../../types';

const tintBg = (hex: string | null | undefined): string | undefined => hex ? hex + '18' : undefined;

interface GroupSelectorProps {
  groups: Group[];
  selectedOptions: number[];
  onOptionToggle: (id: number) => void;
}

const GroupSelector = ({ groups, selectedOptions, onOptionToggle }: GroupSelectorProps) => {
  if (!groups.length) return null;

  return (
    <div className="mb-8">
      {groups.map(group => {
        const GroupIconComp = group.icon ? getIconComponent(group.icon) : null;
        const accentColor = group.color ?? null;
        const headerColor = accentColor ?? 'var(--accent-600)';

        return (
          <div key={group.id} className="mb-6 bg-[var(--surface)] rounded-2xl p-5 border border-[var(--border)] shadow-sm">
            <h3 className="m-0 mb-3 text-base font-medium tracking-wide flex items-center gap-2" style={{ color: headerColor }}>
              {GroupIconComp && <GroupIconComp className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.75} style={{ color: headerColor }} />}
              {group.name}
            </h3>
            <div className="flex flex-wrap gap-2">
              {group.options.map(option => {
                const isSelected = selectedOptions.includes(option.id);
                const OptionIconComp = option.icon ? getIconComponent(option.icon) : null;
                const selectedStyle = accentColor ? {
                  backgroundColor: tintBg(accentColor),
                  borderColor: accentColor,
                  color: 'var(--text)',
                } : {};

                return (
                  <button
                    key={option.id}
                    onClick={() => onOptionToggle(option.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer flex items-center gap-1.5',
                      isSelected
                        ? accentColor
                          ? 'border-2 shadow-sm -translate-y-px'
                          : 'bg-gradient-to-br from-[var(--accent-bg)] to-[var(--accent-bg-2)] text-white border-2 border-[var(--accent-600)] shadow-sm -translate-y-px'
                        : 'bg-[var(--surface)] text-[var(--text)] border-2 border-[var(--border)] shadow-sm hover:border-[var(--accent-600)] hover:-translate-y-px'
                    )}
                    style={isSelected ? selectedStyle : {}}
                  >
                    {OptionIconComp && <OptionIconComp className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" strokeWidth={1.75} />}
                    {option.name}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default GroupSelector;
