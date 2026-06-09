import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Group } from '../types';
import {
  type ActivityMappingAction,
  type MatchedGroup,
  type MatchedOption,
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
} from '../utils/daylioImportUtils';
import apiService from '../services/api';

export interface ImportSummary {
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

export type ImportStep =
  | { type: 'idle' }
  | { type: 'parsed'; summary: ImportSummary }
  | { type: 'mapping'; summary: ImportSummary }
  | { type: 'importing'; done: number; total: number }
  | { type: 'done'; imported: number; skipped: number }
  | { type: 'error'; message: string };

const CHUNK_SIZE = 50;

export function useDaylioImport(groups: Group[], existingDates: Set<string>) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<ImportStep>({ type: 'idle' });
  const [activityMappings, setActivityMappings] = useState<Record<string, ActivityMappingAction>>({});
  const [scaleMappings, setScaleMappings] = useState<Record<string, ScaleMappingAction>>({});
  const [moodMappings, setMoodMappings] = useState<Record<string, number>>({});

  function parse(file: File) {
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

  async function startImport() {
    if (step.type !== 'parsed' && step.type !== 'mapping') return;
    const summary = step.summary;

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

  function advanceToMapping() {
    if (step.type === 'parsed') setStep({ type: 'mapping', summary: step.summary });
  }

  function backToParsed() {
    if (step.type === 'mapping') setStep({ type: 'parsed', summary: step.summary });
  }

  function reset() {
    setStep({ type: 'idle' });
    setActivityMappings({});
    setScaleMappings({});
    setMoodMappings({});
  }

  return {
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
  };
}
