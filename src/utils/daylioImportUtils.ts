import type { Group } from '../types';
import type { DaylioImportPayload } from '../shared/schemas/import';

export interface ParsedScale {
  name: string;
  value: number;
  max: number;
}

export interface ParsedDaylioRow {
  full_date: string;
  time: string;
  /** 1-5, or null when the CSV used a custom mood name we don't recognise. */
  mood: number | null;
  moodName: string;
  activities: string[];
  scales: ParsedScale[];
  content: string;
}

export interface ParseResult {
  rows: ParsedDaylioRow[];
  errors: string[];
}

const MOOD_MAP: Record<string, number> = {
  rad: 5,
  good: 4,
  meh: 3,
  bad: 2,
  awful: 1,
};

// Simple CSV parser that handles RFC-4180 quoted fields.
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  while (i <= line.length) {
    if (line[i] === '"') {
      // Quoted field
      let val = '';
      i++; // skip opening quote
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') {
            val += '"';
            i += 2;
          } else {
            i++; // skip closing quote
            break;
          }
        } else {
          val += line[i];
          i++;
        }
      }
      fields.push(val);
      if (line[i] === ',') i++;
    } else {
      // Unquoted field
      const end = line.indexOf(',', i);
      if (end === -1) {
        fields.push(line.slice(i));
        break;
      } else {
        fields.push(line.slice(i, end));
        i = end + 1;
      }
    }
  }
  return fields;
}

export function parseDaylioCSV(csvText: string): ParseResult {
  const rows: ParsedDaylioRow[] = [];
  const errors: string[] = [];

  // Split on newlines, keeping quoted newlines intact
  const lines: string[] = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    if (ch === '"') {
      inQuote = !inQuote;
      current += ch;
    } else if ((ch === '\n' || ch === '\r') && !inQuote) {
      if (ch === '\r' && csvText[i + 1] === '\n') i++;
      if (current.trim()) lines.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) lines.push(current);

  if (lines.length < 2) {
    errors.push('CSV file appears to be empty or missing header row.');
    return { rows, errors };
  }

  const headers = parseCSVLine(lines[0]).map((h) => h.trim());
  const idx = {
    full_date: headers.indexOf('full_date'),
    time: headers.indexOf('time'),
    mood: headers.indexOf('mood'),
    activities: headers.indexOf('activities'),
    scales: headers.indexOf('scales'),
    note_title: headers.indexOf('note_title'),
    note: headers.indexOf('note'),
  };

  if (idx.full_date === -1 || idx.mood === -1) {
    errors.push('CSV is missing required columns (full_date, mood). Is this a Daylio export?');
    return { rows, errors };
  }

  for (let lineNum = 1; lineNum < lines.length; lineNum++) {
    const fields = parseCSVLine(lines[lineNum]);
    const get = (i: number) => (i !== -1 && i < fields.length ? fields[i] : '');

    const full_date = get(idx.full_date).trim();
    const timeRaw = get(idx.time).trim();
    const moodRaw = get(idx.mood).trim().toLowerCase();
    const activitiesRaw = get(idx.activities);
    const scalesRaw = get(idx.scales);
    const noteTitle = get(idx.note_title);
    const noteHtml = get(idx.note);

    if (!full_date) {
      errors.push(`Row ${lineNum + 1}: missing date, skipped.`);
      continue;
    }

    const mood = MOOD_MAP[moodRaw] ?? null;

    const activities = activitiesRaw
      ? activitiesRaw.split('|').map((a) => a.trim()).filter(Boolean)
      : [];

    const scales: ParsedScale[] = [];
    if (scalesRaw) {
      for (const token of scalesRaw.split('|')) {
        const trimmed = token.trim();
        // Format: "Label: TextLabel N/M"
        const match = trimmed.match(/^(.+?):\s*.+?\s+(\d+)\/(\d+)$/);
        if (match) {
          scales.push({ name: match[1].trim(), value: parseInt(match[2], 10), max: parseInt(match[3], 10) });
        } else {
          errors.push(`Row ${lineNum + 1}: could not parse scale "${trimmed}", skipped.`);
        }
      }
    }

    const content = buildEntryContent(noteTitle, noteHtml);

    rows.push({ full_date, time: timeRaw || '00:00', mood, moodName: moodRaw, activities, scales, content });
  }

  return { rows, errors };
}

export function daylioHtmlToMarkdown(html: string): string {
  let md = html;
  // Line breaks
  md = md.replace(/<br\s*\/?>/gi, '\n');
  // Bold
  md = md.replace(/<(b|strong)>([\s\S]*?)<\/\1>/gi, '**$2**');
  // Italic
  md = md.replace(/<(i|em)>([\s\S]*?)<\/\1>/gi, '_$2_');
  // HTML entities
  md = md.replace(/&nbsp;/gi, ' ');
  md = md.replace(/&amp;/gi, '&');
  md = md.replace(/&lt;/gi, '<');
  md = md.replace(/&gt;/gi, '>');
  md = md.replace(/&quot;/gi, '"');
  // Strip remaining tags
  md = md.replace(/<[^>]+>/g, '');
  // Collapse excessive newlines
  md = md.replace(/\n{3,}/g, '\n\n');
  return md.trim();
}

export function buildEntryContent(noteTitle: string, noteHtml: string): string {
  const body = daylioHtmlToMarkdown(noteHtml);
  if (noteTitle.trim()) {
    return `# ${noteTitle.trim()}\n\n${body}`.trim();
  }
  return body;
}

export function collectUniqueActivities(rows: ParsedDaylioRow[]): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    for (const a of row.activities) set.add(a);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function collectUnknownMoods(rows: ParsedDaylioRow[]): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    if (row.mood === null && row.moodName) set.add(row.moodName);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function collectUniqueScales(rows: ParsedDaylioRow[]): Array<{ name: string; max: number }> {
  const map = new Map<string, number>();
  for (const row of rows) {
    for (const s of row.scales) {
      if (!map.has(s.name)) map.set(s.name, s.max);
    }
  }
  return [...map.entries()].map(([name, max]) => ({ name, max }));
}

export interface MatchedOption {
  optionId: number;
  groupId: number;
  optionName: string;
  groupName: string;
}

export interface MatchedGroup {
  groupId: number;
  groupName: string;
}

export function matchActivitiesToOptions(
  activityNames: string[],
  groups: Group[]
): { matched: Map<string, MatchedOption>; unmatched: string[] } {
  const matched = new Map<string, MatchedOption>();
  const unmatched: string[] = [];

  for (const name of activityNames) {
    const lower = name.toLowerCase();
    let found: MatchedOption | null = null;
    outer: for (const g of groups) {
      if (g.type !== 'category') continue;
      for (const opt of g.options) {
        if (opt.name.toLowerCase() === lower) {
          found = { optionId: opt.id, groupId: g.id, optionName: opt.name, groupName: g.name };
          break outer;
        }
      }
    }
    if (found) {
      matched.set(name, found);
    } else {
      unmatched.push(name);
    }
  }

  return { matched, unmatched };
}

export function matchScalesToGroups(
  scales: Array<{ name: string; max: number }>,
  groups: Group[]
): { matched: Map<string, MatchedGroup>; unmatched: Array<{ name: string; max: number }> } {
  const matched = new Map<string, MatchedGroup>();
  const unmatched: Array<{ name: string; max: number }> = [];

  for (const scale of scales) {
    const lower = scale.name.toLowerCase();
    const found = groups.find((g) => g.type === 'slider' && g.name.toLowerCase() === lower);
    if (found) {
      matched.set(scale.name, { groupId: found.id, groupName: found.name });
    } else {
      unmatched.push(scale);
    }
  }

  return { matched, unmatched };
}

function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = curr;
  }
  return prev[n];
}

/**
 * Best-effort fuzzy match for an activity name against existing options.
 * Priority: exact after normalization, then containment ("run" -> "Running"),
 * then small edit distance ("excercise" -> "exercise").
 */
export function suggestActivityMatch(name: string, groups: Group[]): MatchedOption | null {
  const target = normalizeForMatch(name);
  if (!target) return null;

  let containsMatch: MatchedOption | null = null;
  let editMatch: MatchedOption | null = null;
  let bestEditDistance = Infinity;

  for (const g of groups) {
    if (g.type !== 'category') continue;
    for (const opt of g.options) {
      const candidate = normalizeForMatch(opt.name);
      if (!candidate) continue;
      const match: MatchedOption = { optionId: opt.id, groupId: g.id, optionName: opt.name, groupName: g.name };
      if (candidate === target) return match;
      if (!containsMatch && target.length >= 3 && candidate.length >= 3 &&
          (candidate.includes(target) || target.includes(candidate))) {
        containsMatch = match;
      }
      if (target.length >= 4 && candidate.length >= 4) {
        const dist = levenshtein(target, candidate);
        if (dist <= 2 && dist < bestEditDistance) {
          bestEditDistance = dist;
          editMatch = match;
        }
      }
    }
  }

  return containsMatch ?? editMatch;
}

export type ActivityMappingAction =
  | { action: 'map'; optionId: number }
  | { action: 'create'; targetGroupId: number | 'new-imported' }
  | { action: 'skip' };

export type ScaleMappingAction =
  | { action: 'map'; groupId: number }
  | { action: 'create' }
  | { action: 'skip' };

export function buildImportPayload(
  rows: ParsedDaylioRow[],
  activityMappings: Record<string, ActivityMappingAction>,
  scaleMappings: Record<string, ScaleMappingAction>,
  moodMappings: Record<string, number>,
  matchedActivities: Map<string, MatchedOption>,
  matchedScales: Map<string, MatchedGroup>,
  unmatchedScales: Array<{ name: string; max: number }>,
  groups: Group[],
  existingDates: Set<string>
): DaylioImportPayload {
  // Determine if we need the "Imported Activities" group
  const needsImportedGroup = Object.values(activityMappings).some(
    (m) => m.action === 'create' && m.targetGroupId === 'new-imported'
  );

  const newGroups: DaylioImportPayload['new_groups'] = [];
  const newOptions: DaylioImportPayload['new_options'] = [];
  const scaleMaxByName = new Map(unmatchedScales.map((s) => [s.name, s.max]));
  const groupById = new Map(groups.map((g) => [g.id, g]));

  if (needsImportedGroup) {
    newGroups.push({ temp_id: '__imported_activities__', name: 'Imported Activities', type: 'category' });
  }

  // Create new groups for unmatched scales that need creation
  for (const [scaleName, action] of Object.entries(scaleMappings)) {
    if (action.action === 'create') {
      const max = scaleMaxByName.get(scaleName) ?? 5;
      newGroups.push({ temp_id: `__scale_${scaleName}__`, name: scaleName, type: 'slider', slider_min: 1, slider_max: max });
    }
  }

  // Create new options for unmatched activities that need creation
  const activityTempIds = new Map<string, string>();
  for (const [actName, action] of Object.entries(activityMappings)) {
    if (action.action === 'create') {
      const tempId = `__opt_${actName}__`;
      activityTempIds.set(actName, tempId);
      if (action.targetGroupId === 'new-imported') {
        newOptions.push({ temp_id: tempId, group_temp_id: '__imported_activities__', name: actName });
      } else {
        newOptions.push({ temp_id: tempId, group_id: action.targetGroupId, name: actName });
      }
    }
  }

  const entries: DaylioImportPayload['entries'] = [];

  const clampToGroup = (groupId: number, value: number): number => {
    const g = groupById.get(groupId);
    const min = g?.slider_min ?? 1;
    const max = g?.slider_max ?? 5;
    return Math.min(max, Math.max(min, value));
  };

  for (const row of rows) {
    if (existingDates.has(row.full_date)) continue;

    const option_ids: number[] = [];
    const option_temp_ids: string[] = [];
    const slider_values: Record<number, number> = {};
    const slider_temp_values: Record<string, number> = {};

    for (const actName of row.activities) {
      // Check auto-matched first
      const autoMatch = matchedActivities.get(actName);
      if (autoMatch) {
        option_ids.push(autoMatch.optionId);
        continue;
      }
      const mapping = activityMappings[actName];
      if (!mapping || mapping.action === 'skip') continue;
      if (mapping.action === 'map') {
        option_ids.push(mapping.optionId);
      } else if (mapping.action === 'create') {
        const tempId = activityTempIds.get(actName);
        if (tempId) option_temp_ids.push(tempId);
      }
    }

    for (const scale of row.scales) {
      const autoMatch = matchedScales.get(scale.name);
      if (autoMatch) {
        slider_values[autoMatch.groupId] = clampToGroup(autoMatch.groupId, scale.value);
        continue;
      }
      const mapping = scaleMappings[scale.name];
      if (!mapping || mapping.action === 'skip') continue;
      if (mapping.action === 'map') {
        slider_values[mapping.groupId] = clampToGroup(mapping.groupId, scale.value);
      } else if (mapping.action === 'create') {
        slider_temp_values[`__scale_${scale.name}__`] = scale.value;
      }
    }

    const isoTime = `${row.full_date}T${row.time}:00.000Z`;

    entries.push({
      date: row.full_date,
      time: isoTime,
      mood: row.mood ?? moodMappings[row.moodName] ?? 3,
      content: row.content,
      option_ids,
      option_temp_ids,
      slider_values,
      slider_temp_values,
    });
  }

  return { new_groups: newGroups, new_options: newOptions, entries };
}

/**
 * Rewrites entries to use real IDs after the prepare call has created
 * new groups/options server-side, so subsequent chunked import requests
 * carry no temp references.
 */
export function resolveTempIds(
  entries: DaylioImportPayload['entries'],
  groupIds: Record<string, number>,
  optionIds: Record<string, number>
): DaylioImportPayload['entries'] {
  return entries.map((entry) => {
    const option_ids = [
      ...entry.option_ids,
      ...entry.option_temp_ids.map((tid) => {
        const id = optionIds[tid];
        if (id === undefined) throw new Error(`Server did not return an ID for option "${tid}"`);
        return id;
      }),
    ];
    const slider_values: Record<number, number> = { ...entry.slider_values };
    for (const [tempId, value] of Object.entries(entry.slider_temp_values)) {
      const groupId = groupIds[tempId];
      if (groupId === undefined) throw new Error(`Server did not return an ID for group "${tempId}"`);
      slider_values[groupId] = value;
    }
    return { ...entry, option_ids, option_temp_ids: [], slider_values, slider_temp_values: {} };
  });
}
