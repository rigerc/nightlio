import type React from 'react';
import { cn } from '../../lib/utils';
import { getIconComponent } from '../../utils/iconRegistry';
import type { Group } from '../../types';

const tintBg = (hex: string | null | undefined): string | undefined => hex ? hex + '18' : undefined;

interface SliderGroupPickerProps {
  group: Group;
  value: number | undefined;
  onChange: (groupId: number, value: number | undefined) => void;
}

const SliderGroupPicker = ({ group, value, onChange }: SliderGroupPickerProps) => {
  const min = group.slider_min ?? 1;
  const max = group.slider_max ?? 5;
  const color = group.color ?? 'var(--accent-600)';
  const labels = group.slider_labels ?? [];
  const steps = max - min + 1;
  const isSet = value !== undefined;
  const displayValue = value ?? min;
  const currentLabel = isSet ? (labels[displayValue - min] ?? String(displayValue)) : null;
  const pct = steps > 1 ? ((displayValue - min) / (max - min)) * 100 : 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Value readout */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          {isSet ? (
            <>
              <span className="text-3xl font-bold tabular-nums leading-none" style={{ color }}>
                {displayValue}
              </span>
              {currentLabel && (
                <span className="text-base font-medium" style={{ color }}>
                  {currentLabel}
                </span>
              )}
            </>
          ) : (
            <span className="text-sm italic text-[var(--text-muted)]">Not set — drag to record</span>
          )}
        </div>
        {isSet && (
          <button
            type="button"
            onClick={() => onChange(group.id, undefined)}
            className="shrink-0 text-xs text-[var(--text-muted)] transition-colors hover:text-red-500"
          >
            Clear
          </button>
        )}
      </div>

      {/* Range input */}
      <div className="relative flex flex-col gap-1.5">
        <div className="relative h-2 w-full rounded-full" style={{ backgroundColor: color + '22' }}>
          {isSet && (
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: color }}
            />
          )}
          <input
            type="range"
            min={min}
            max={max}
            value={displayValue}
            onChange={e => onChange(group.id, Number(e.target.value))}
            className={cn(
              'absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent',
              '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-110',
              '[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md',
              !isSet && 'opacity-50',
            )}
            style={{
              '--thumb-color': color,
            } as React.CSSProperties}
          />
        </div>

        {/* Step labels */}
        {labels.length === steps && (
          <div className="flex justify-between">
            {labels.map((label, i) => {
              const stepVal = min + i;
              const active = isSet && stepVal === displayValue;
              return (
                <span
                  key={i}
                  className={cn(
                    'text-xs transition-colors',
                    active ? 'font-semibold' : 'text-[var(--text-muted)]',
                  )}
                  style={active ? { color } : undefined}
                >
                  {label}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

interface GroupSelectorProps {
  groups: Group[];
  selectedOptions: number[];
  onOptionToggle: (id: number) => void;
  sliderValues: Record<number, number | undefined>;
  onSliderChange: (groupId: number, value: number | undefined) => void;
}

const GroupSelector = ({ groups, selectedOptions, onOptionToggle, sliderValues, onSliderChange }: GroupSelectorProps) => {
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
            {group.type === 'slider' ? (
              <SliderGroupPicker group={group} value={sliderValues[group.id]} onChange={onSliderChange} />
            ) : (
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
            )}
          </div>
        );
      })}
    </div>
  );
};

export default GroupSelector;
