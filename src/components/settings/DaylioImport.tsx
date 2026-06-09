import { useRef } from 'react';
import { Link } from 'react-router-dom';
import type { Group } from '../../types';
import { useDaylioImport } from '../../hooks/useDaylioImport';

interface Props {
  groups: Group[];
  existingDates: Set<string>;
}

const MOOD_LEVEL_LABELS: Array<{ value: number; label: string }> = [
  { value: 1, label: '1 — Terrible' },
  { value: 2, label: '2 — Bad' },
  { value: 3, label: '3 — Okay' },
  { value: 4, label: '4 — Good' },
  { value: 5, label: '5 — Amazing' },
];

export default function DaylioImport({ groups, existingDates }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const {
    step,
    activityMappings,
    scaleMappings,
    moodMappings,
    setActivityMappings,
    setScaleMappings,
    setMoodMappings,
    parse,
    startImport,
    advanceToMapping,
    backToParsed,
    reset,
  } = useDaylioImport(groups, existingDates);

  function handleReset() {
    reset();
    if (fileRef.current) fileRef.current.value = '';
  }

  function handleFileChange(e: { target: HTMLInputElement }) {
    const file = e.target.files?.[0];
    if (file) parse(file);
  }

  if (step.type === 'idle') {
    return (
      <div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
          id="daylio-csv-input"
          aria-label="Choose Daylio CSV file"
        />
        <label
          htmlFor="daylio-csv-input"
          className="inline-block px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm cursor-pointer hover:border-[var(--accent-600)] hover:bg-[var(--accent-bg-softer)] transition-colors"
        >
          Choose CSV file
        </label>
      </div>
    );
  }

  if (step.type === 'parsed') {
    const { summary } = step;
    const needsMapping =
      summary.unmatchedActivities.length > 0 ||
      summary.unmatchedScales.length > 0 ||
      summary.unknownMoods.length > 0;
    const toImport = summary.rows.length - summary.willSkip;
    return (
      <div className="space-y-3">
        <div className="text-sm text-[var(--text)]">
          <p className="mt-0 mb-1"><strong>{summary.rows.length}</strong> entr{summary.rows.length === 1 ? 'y' : 'ies'} found
            {summary.dateRange && <> ({summary.dateRange.first} → {summary.dateRange.last})</>}
          </p>
          {summary.willSkip > 0 && (
            <p className="mt-0 mb-1 text-[var(--text-muted)]">
              {summary.willSkip} will be skipped (dates already exist). {toImport} will be imported.
            </p>
          )}
          {summary.matchedActivities.size > 0 && (
            <p className="mt-0 mb-1 text-[var(--text-muted)]">
              {summary.matchedActivities.size} activit{summary.matchedActivities.size === 1 ? 'y' : 'ies'} matched to existing options.
            </p>
          )}
          {summary.matchedScales.size > 0 && (
            <p className="mt-0 mb-1 text-[var(--text-muted)]">
              {summary.matchedScales.size} scale{summary.matchedScales.size === 1 ? '' : 's'} matched to existing sliders.
            </p>
          )}
          {summary.unmatchedActivities.length > 0 && (
            <p className="mt-0 mb-1 text-[var(--text-muted)]">
              {summary.unmatchedActivities.length} unrecognised activit{summary.unmatchedActivities.length === 1 ? 'y' : 'ies'} — configure below.
            </p>
          )}
          {summary.unmatchedScales.length > 0 && (
            <p className="mt-0 mb-1 text-[var(--text-muted)]">
              {summary.unmatchedScales.length} unrecognised scale{summary.unmatchedScales.length === 1 ? '' : 's'} — configure below.
            </p>
          )}
          {summary.unknownMoods.length > 0 && (
            <p className="mt-0 mb-1 text-[var(--text-muted)]">
              {summary.unknownMoods.length} custom mood name{summary.unknownMoods.length === 1 ? '' : 's'} — configure below.
            </p>
          )}
          {summary.parseErrors.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-[var(--text-muted)] text-xs">
                {summary.parseErrors.length} parse warning{summary.parseErrors.length === 1 ? '' : 's'}
              </summary>
              <ul className="mt-1 text-xs text-[var(--text-muted)] pl-4">
                {summary.parseErrors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </details>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {needsMapping ? (
            <button
              type="button"
              onClick={advanceToMapping}
              className="px-4 py-2 rounded-lg bg-[var(--accent-600)] text-white text-sm hover:opacity-90 transition-opacity"
            >
              Continue to mapping
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void startImport()}
              className="px-4 py-2 rounded-lg bg-[var(--accent-600)] text-white text-sm hover:opacity-90 transition-opacity"
            >
              Import {toImport} {toImport === 1 ? 'entry' : 'entries'}
            </button>
          )}
          <button type="button" onClick={handleReset} className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text)] text-sm hover:bg-[var(--accent-bg-softer)] transition-colors">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (step.type === 'mapping') {
    const { summary } = step;
    const categoryGroups = groups.filter((g) => g.type === 'category');
    const sliderGroups = groups.filter((g) => g.type === 'slider');
    const toImport = summary.rows.length - summary.willSkip;

    return (
      <div className="space-y-4">
        {summary.unknownMoods.length > 0 && (
          <div>
            <h4 className="mt-0 mb-2 text-sm font-semibold text-[var(--text)]">Custom mood names</h4>
            <p className="mt-0 mb-3 text-xs text-[var(--text-muted)]">These Daylio mood names aren't standard. Choose the mood level (1–5) each one maps to.</p>
            <div className="space-y-2">
              {summary.unknownMoods.map((moodName) => (
                <div key={moodName} className="flex flex-wrap items-center gap-2 py-2 border-t border-[var(--border)]">
                  <span className="text-sm text-[var(--text)] min-w-[120px] font-medium">{moodName}</span>
                  <select
                    value={moodMappings[moodName] ?? 3}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setMoodMappings((prev) => ({ ...prev, [moodName]: val }));
                    }}
                    className="text-sm border border-[var(--border)] rounded bg-[var(--bg)] text-[var(--text)] px-2 py-1 flex-1 min-w-[200px]"
                  >
                    {MOOD_LEVEL_LABELS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {summary.unmatchedActivities.length > 0 && (
          <div>
            <h4 className="mt-0 mb-2 text-sm font-semibold text-[var(--text)]">Unrecognised activities</h4>
            <p className="mt-0 mb-3 text-xs text-[var(--text-muted)]">Choose what to do with each activity not found in your Waymark setup.</p>
            <div className="space-y-2">
              {summary.unmatchedActivities.map((act) => {
                const mapping = activityMappings[act] ?? { action: 'create', targetGroupId: 'new-imported' };
                const suggestion = summary.suggestions.get(act);
                const isSuggested = suggestion && mapping.action === 'map' && mapping.optionId === suggestion.optionId;
                return (
                  <div key={act} className="flex flex-wrap items-center gap-2 py-2 border-t border-[var(--border)]">
                    <span className="text-sm text-[var(--text)] min-w-[120px] font-medium">
                      {act}
                      {isSuggested && (
                        <span className="block text-xs font-normal text-[var(--text-muted)]">suggested match</span>
                      )}
                    </span>
                    <select
                      value={mapping.action === 'map' ? `map:${mapping.optionId}` : mapping.action === 'create' ? (mapping.targetGroupId === 'new-imported' ? 'create:new' : `create:${mapping.targetGroupId}`) : 'skip'}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'skip') {
                          setActivityMappings((prev) => ({ ...prev, [act]: { action: 'skip' } }));
                        } else if (val === 'create:new') {
                          setActivityMappings((prev) => ({ ...prev, [act]: { action: 'create', targetGroupId: 'new-imported' } }));
                        } else if (val.startsWith('create:')) {
                          const gid = parseInt(val.slice(7), 10);
                          setActivityMappings((prev) => ({ ...prev, [act]: { action: 'create', targetGroupId: gid } }));
                        } else if (val.startsWith('map:')) {
                          const oid = parseInt(val.slice(4), 10);
                          setActivityMappings((prev) => ({ ...prev, [act]: { action: 'map', optionId: oid } }));
                        }
                      }}
                      className="text-sm border border-[var(--border)] rounded bg-[var(--bg)] text-[var(--text)] px-2 py-1 flex-1 min-w-[200px]"
                    >
                      <optgroup label="Create new">
                        <option value="create:new">Add to "Imported Activities" group</option>
                        {categoryGroups.map((g) => (
                          <option key={g.id} value={`create:${g.id}`}>Add to "{g.name}"</option>
                        ))}
                      </optgroup>
                      <optgroup label="Map to existing option">
                        {categoryGroups.map((g) =>
                          g.options.map((opt) => (
                            <option key={opt.id} value={`map:${opt.id}`}>{g.name} / {opt.name}</option>
                          ))
                        )}
                      </optgroup>
                      <option value="skip">Skip this activity</option>
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {summary.unmatchedScales.length > 0 && (
          <div>
            <h4 className="mt-0 mb-2 text-sm font-semibold text-[var(--text)]">Unrecognised scales</h4>
            <p className="mt-0 mb-3 text-xs text-[var(--text-muted)]">Choose what to do with each scale not found in your Waymark sliders.</p>
            <div className="space-y-2">
              {summary.unmatchedScales.map((scale) => {
                const mapping = scaleMappings[scale.name] ?? { action: 'create' };
                return (
                  <div key={scale.name} className="flex flex-wrap items-center gap-2 py-2 border-t border-[var(--border)]">
                    <span className="text-sm text-[var(--text)] min-w-[120px] font-medium">{scale.name}</span>
                    <select
                      value={mapping.action === 'map' ? `map:${mapping.groupId}` : mapping.action}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'skip') {
                          setScaleMappings((prev) => ({ ...prev, [scale.name]: { action: 'skip' } }));
                        } else if (val === 'create') {
                          setScaleMappings((prev) => ({ ...prev, [scale.name]: { action: 'create' } }));
                        } else if (val.startsWith('map:')) {
                          const gid = parseInt(val.slice(4), 10);
                          setScaleMappings((prev) => ({ ...prev, [scale.name]: { action: 'map', groupId: gid } }));
                        }
                      }}
                      className="text-sm border border-[var(--border)] rounded bg-[var(--bg)] text-[var(--text)] px-2 py-1 flex-1 min-w-[200px]"
                    >
                      <option value="create">Create new slider "{scale.name}" (1–{scale.max})</option>
                      {sliderGroups.map((g) => (
                        <option key={g.id} value={`map:${g.id}`}>Map to "{g.name}"</option>
                      ))}
                      <option value="skip">Skip this scale</option>
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-2 flex-wrap pt-2">
          <button
            type="button"
            onClick={() => void startImport()}
            className="px-4 py-2 rounded-lg bg-[var(--accent-600)] text-white text-sm hover:opacity-90 transition-opacity"
          >
            Import {toImport} {toImport === 1 ? 'entry' : 'entries'}
          </button>
          <button
            type="button"
            onClick={backToParsed}
            className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text)] text-sm hover:bg-[var(--accent-bg-softer)] transition-colors"
          >
            Back
          </button>
          <button type="button" onClick={handleReset} className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text)] text-sm hover:bg-[var(--accent-bg-softer)] transition-colors">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (step.type === 'importing') {
    const pct = step.total > 0 ? Math.round((step.done / step.total) * 100) : 0;
    return (
      <div className="space-y-2" role="status">
        <p className="mt-0 mb-0 text-sm text-[var(--text-muted)]">
          Importing… {step.done} of {step.total} entries
        </p>
        <div className="w-full h-2 rounded-full bg-[var(--border)] overflow-hidden" aria-hidden="true">
          <div
            className="h-full bg-[var(--accent-600)] transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  if (step.type === 'done') {
    return (
      <div className="space-y-2">
        <p className="mt-0 mb-0 text-sm text-[var(--text)]">
          Import complete. <strong>{step.imported}</strong> {step.imported === 1 ? 'entry' : 'entries'} imported
          {step.skipped > 0 && <>, <strong>{step.skipped}</strong> skipped (already existed)</>}.
        </p>
        <div className="flex gap-2 flex-wrap">
          <Link
            to="/history"
            className="px-4 py-2 rounded-lg bg-[var(--accent-600)] text-white text-sm hover:opacity-90 transition-opacity"
          >
            View history
          </Link>
          <button type="button" onClick={handleReset} className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text)] text-sm hover:bg-[var(--accent-bg-softer)] transition-colors">
            Import another file
          </button>
        </div>
      </div>
    );
  }

  if (step.type === 'error') {
    return (
      <div className="space-y-2">
        <p className="mt-0 mb-0 text-sm text-[var(--danger)]" role="alert">{step.message}</p>
        <button type="button" onClick={handleReset} className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text)] text-sm hover:bg-[var(--accent-bg-softer)] transition-colors">
          Try again
        </button>
      </div>
    );
  }

  return null;
}
