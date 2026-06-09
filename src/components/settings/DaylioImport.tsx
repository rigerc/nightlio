import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { Group } from '../../types';
import {
  type ActivityMappingAction,
  type MatchedOption,
  type MatchedGroup,
  type ParsedDaylioRow,
  type ScaleMappingAction,
  buildImportPayload,
  collectUniqueActivities,
  collectUniqueScales,
  collectUnknownMoods,
  matchActivitiesToOptions,
  matchScalesToGroups,
  parseDaylioCSV,
  resolveTempIds,
  suggestActivityMatch,
} from '../../utils/daylioImportUtils';
import apiService from '../../services/api';

interface Props {
  groups: Group[];
  existingDates: Set<string>;
}

interface ImportSummary {
  rows: ParsedDaylioRow[];
  parseErrors: string[];
  willSkip: number;
  unmatchedActivities: string[];
  unmatchedScales: Array<{ name: string; max: number }>;
  unknownMoods: string[];
  matchedActivities: Map<string, MatchedOption>;
  matchedScales: Map<string, MatchedGroup>;
  suggestions: Map<string, MatchedOption>;
  dateRange: { first: string; last: string } | null;
}

type Step =
  | { type: 'idle' }
  | { type: 'parsed'; summary: ImportSummary }
  | { type: 'mapping'; summary: ImportSummary }
  | { type: 'importing'; done: number; total: number }
  | { type: 'done'; imported: number; skipped: number }
  | { type: 'error'; message: string };

const CHUNK_SIZE = 50;

const MOOD_LEVEL_LABELS: Array<{ value: number; label: string }> = [
  { value: 1, label: '1 — Terrible' },
  { value: 2, label: '2 — Bad' },
  { value: 3, label: '3 — Okay' },
  { value: 4, label: '4 — Good' },
  { value: 5, label: '5 — Amazing' },
];

export default function DaylioImport({ groups, existingDates }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>({ type: 'idle' });
  const [activityMappings, setActivityMappings] = useState<Record<string, ActivityMappingAction>>({});
  const [scaleMappings, setScaleMappings] = useState<Record<string, ScaleMappingAction>>({});
  const [moodMappings, setMoodMappings] = useState<Record<string, number>>({});

  function handleFileChange(e: { target: HTMLInputElement }) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { rows, errors } = parseDaylioCSV(text);

      if (rows.length === 0) {
        setStep({ type: 'error', message: errors.length > 0 ? errors.join(' ') : 'No entries found in this CSV.' });
        return;
      }

      const allActivities = collectUniqueActivities(rows);
      const allScales = collectUniqueScales(rows);
      const unknownMoods = collectUnknownMoods(rows);
      const { matched: matchedActivities, unmatched: unmatchedActivities } = matchActivitiesToOptions(allActivities, groups);
      const { matched: matchedScales, unmatched: unmatchedScales } = matchScalesToGroups(allScales, groups);

      const willSkip = rows.filter((r) => existingDates.has(r.full_date)).length;
      const dates = rows.map((r) => r.full_date).sort();
      const dateRange = dates.length > 0 ? { first: dates[0], last: dates[dates.length - 1] } : null;

      const suggestions = new Map<string, MatchedOption>();
      const defaultActivityMappings: Record<string, ActivityMappingAction> = {};
      for (const act of unmatchedActivities) {
        const suggestion = suggestActivityMatch(act, groups);
        if (suggestion) {
          suggestions.set(act, suggestion);
          defaultActivityMappings[act] = { action: 'map', optionId: suggestion.optionId };
        } else {
          defaultActivityMappings[act] = { action: 'create', targetGroupId: 'new-imported' };
        }
      }
      const defaultScaleMappings: Record<string, ScaleMappingAction> = {};
      for (const scale of unmatchedScales) {
        defaultScaleMappings[scale.name] = { action: 'create' };
      }
      const defaultMoodMappings: Record<string, number> = {};
      for (const mood of unknownMoods) {
        defaultMoodMappings[mood] = 3;
      }

      setActivityMappings(defaultActivityMappings);
      setScaleMappings(defaultScaleMappings);
      setMoodMappings(defaultMoodMappings);
      setStep({
        type: 'parsed',
        summary: {
          rows, parseErrors: errors, willSkip, unmatchedActivities, unmatchedScales,
          unknownMoods, matchedActivities, matchedScales, suggestions, dateRange,
        },
      });
    };
    reader.readAsText(file);
  }

  async function runImport(summary: ImportSummary) {
    const payload = buildImportPayload(
      summary.rows,
      activityMappings,
      scaleMappings,
      moodMappings,
      summary.matchedActivities,
      summary.matchedScales,
      summary.unmatchedScales,
      groups,
      existingDates
    );

    const total = payload.entries.length;
    setStep({ type: 'importing', done: 0, total });

    let imported = 0;
    let skipped = 0;

    try {
      // Phase 1: create groups/options, then rewrite entries to real IDs so
      // each chunked request is self-contained.
      let entries = payload.entries;
      if (payload.new_groups.length > 0 || payload.new_options.length > 0) {
        const prep = await apiService.prepareDaylioImport({
          new_groups: payload.new_groups,
          new_options: payload.new_options,
        });
        entries = resolveTempIds(entries, prep.group_ids, prep.option_ids);
      }

      // Phase 2: import in chunks to stay within server request limits.
      for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
        const chunk = entries.slice(i, i + CHUNK_SIZE);
        const result = await apiService.importDaylio({ new_groups: [], new_options: [], entries: chunk });
        imported += result.imported;
        skipped += result.skipped;
        setStep({ type: 'importing', done: Math.min(i + CHUNK_SIZE, entries.length), total });
      }

      await queryClient.invalidateQueries({ queryKey: ['moods'] });
      setStep({ type: 'done', imported, skipped });
    } catch (err) {
      if (imported > 0) {
        await queryClient.invalidateQueries({ queryKey: ['moods'] });
      }
      const base = err instanceof Error ? err.message : 'Import failed.';
      const partial = imported > 0
        ? ` ${imported} entr${imported === 1 ? 'y was' : 'ies were'} imported before the error — retrying is safe, already-imported dates will be skipped.`
        : '';
      setStep({ type: 'error', message: base + partial });
    }
  }

  function reset() {
    setStep({ type: 'idle' });
    if (fileRef.current) fileRef.current.value = '';
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
              onClick={() => setStep({ type: 'mapping', summary })}
              className="px-4 py-2 rounded-lg bg-[var(--accent-600)] text-white text-sm hover:opacity-90 transition-opacity"
            >
              Continue to mapping
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void runImport(summary)}
              className="px-4 py-2 rounded-lg bg-[var(--accent-600)] text-white text-sm hover:opacity-90 transition-opacity"
            >
              Import {toImport} {toImport === 1 ? 'entry' : 'entries'}
            </button>
          )}
          <button type="button" onClick={reset} className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text)] text-sm hover:bg-[var(--accent-bg-softer)] transition-colors">
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
            onClick={() => void runImport(summary)}
            className="px-4 py-2 rounded-lg bg-[var(--accent-600)] text-white text-sm hover:opacity-90 transition-opacity"
          >
            Import {toImport} {toImport === 1 ? 'entry' : 'entries'}
          </button>
          <button
            type="button"
            onClick={() => setStep({ type: 'parsed', summary })}
            className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text)] text-sm hover:bg-[var(--accent-bg-softer)] transition-colors"
          >
            Back
          </button>
          <button type="button" onClick={reset} className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text)] text-sm hover:bg-[var(--accent-bg-softer)] transition-colors">
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
          <button type="button" onClick={reset} className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text)] text-sm hover:bg-[var(--accent-bg-softer)] transition-colors">
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
        <button type="button" onClick={reset} className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text)] text-sm hover:bg-[var(--accent-bg-softer)] transition-colors">
          Try again
        </button>
      </div>
    );
  }

  return null;
}
