import { cn } from '../../lib/utils';

const GroupSelector = ({ groups, selectedOptions, onOptionToggle }) => {
  if (!groups.length) return null;

  return (
    <div className="mb-8">
      {groups.map(group => (
        <div
          key={group.id}
          className="mb-6 bg-[var(--surface)] rounded-2xl p-5 border border-[var(--border)] shadow-sm"
        >
          <h3 className="m-0 mb-3 text-[var(--accent-600)] text-base font-medium tracking-wide">
            {group.name}
          </h3>
          <div className="flex flex-wrap gap-2">
            {group.options.map(option => {
              const isSelected = selectedOptions.includes(option.id);
              return (
                <button
                  key={option.id}
                  onClick={() => onOptionToggle(option.id)}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer',
                    isSelected
                      ? 'bg-gradient-to-br from-[var(--accent-bg)] to-[var(--accent-bg-2)] text-white border-2 border-[var(--accent-600)] shadow-sm -translate-y-px'
                      : 'bg-[var(--surface)] text-[var(--text)] border-2 border-[var(--border)] shadow-sm hover:border-[var(--accent-600)] hover:-translate-y-px'
                  )}
                >
                  {option.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default GroupSelector;
