import { useRef, useEffect, useCallback, useState } from 'react';
import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  CloudOff,
  Loader2,
  Save,
  Star,
} from 'lucide-react';
import MoodPicker from '../components/mood/MoodPicker';
import MoodDisplay from '../components/mood/MoodDisplay';
import MoodLogList from '../components/mood/MoodLogList';
import ReflectionPrompt from '../components/journal/ReflectionPrompt';
import GroupSelector from '../components/groups/GroupSelector';
import MDArea from '../components/MarkdownArea';
import type { MarkdownAreaRef } from '../components/MarkdownArea';
import apiService from '../services/api';
import { useToast } from '../components/ui/ToastProvider';
import { useBurner } from '../contexts/BurnerContext';
import type { MoodValue, Entry, Group, Selection, SliderValue, MoodCreateResponse, MoodUpdateResponse } from '../types';

const DEFAULT_MARKDOWN = '';
const dateToInputValue = (displayDate: string): string => {
  const d = new Date(displayDate);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const inputValueToDisplayDate = (isoDate: string): string => {
  const [y, mo, d] = isoDate.split('-').map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString();
};
const AUTOSAVE_DEBOUNCE_MS = 1200;

type SaveState = 'idle' | 'saving' | 'dirty' | 'error' | 'saved' | 'disabled';

// Client-side representation of the editable entry fields, fed into React Hook Form.
// Validation here is intentionally loose (typing/coercion only) — the authoritative
// rules (mood range, non-empty content, important_reason requirements) live in the
// shared moodCreateSchema/moodUpdateSchema enforced by the API.
const entryFormSchema = z.object({
  selectedOptions: z.array(z.number()),
  sliderValues: z.record(z.coerce.number(), z.number()),
  content: z.string(),
  isImportant: z.boolean(),
  importantReason: z.string(),
});

type EntryFormValues = z.infer<typeof entryFormSchema>;

interface SavePayload {
  mood: number | null;
  content: string;
  selected_options: number[];
  slider_values: Record<number, number>;
  is_important: boolean;
  important_reason: string;
}

interface LatestPayload {
  payload: SavePayload;
  snapshot: string;
}

type MutationVariables = LatestPayload & { entryId: number | null };

interface EntryViewProps {
  selectedMood?: MoodValue;
  groups: Group[];
  onBack: () => void;
  onEntryDeleted: (id: number) => void;
  onSelectMood: (moodValue: MoodValue) => void;
  editingEntry?: Entry | null;
  onEntryUpserted: (
    entry: Partial<Entry> & { id: number },
    opts?: { isNew?: boolean }
  ) => void;
  onEntrySaved: () => void;
  onEditMoodSelect?: (moodValue: MoodValue) => void;
}

const normalizeSelectedOptions = (optionIds: number[] = []): number[] =>
  [...optionIds].map((id) => Number(id)).filter((id) => Number.isFinite(id)).sort((a, b) => a - b);

const normalizeSliderValues = (values: Record<number, number> = {}): [number, number][] =>
  Object.entries(values)
    .map(([groupId, value]) => [Number(groupId), Number(value)] as [number, number])
    .filter(([groupId, value]) => Number.isFinite(groupId) && Number.isFinite(value))
    .sort((a, b) => a[0] - b[0]);

const buildSnapshot = ({
  mood,
  content,
  selectedOptions,
  sliderValues,
  isImportant,
  importantReason,
}: {
  mood: number | null | undefined;
  content: string;
  selectedOptions: number[];
  sliderValues: Record<number, number>;
  isImportant: boolean;
  importantReason: string;
}): string =>
  JSON.stringify({
    mood: mood ?? null,
    content: content ?? '',
    selected_options: normalizeSelectedOptions(selectedOptions),
    slider_values: normalizeSliderValues(sliderValues),
    is_important: isImportant,
    important_reason: importantReason,
  });

const buildDefaultFormValues = (entry: Entry | null): EntryFormValues => ({
  selectedOptions: entry?.selections?.map((s) => s.id) ?? [],
  sliderValues: Object.fromEntries((entry?.slider_values ?? []).map((sv) => [sv.group_id, sv.value])),
  content: entry?.content || DEFAULT_MARKDOWN,
  isImportant: entry?.is_important ?? false,
  importantReason: entry?.important_reason ?? '',
});

const EMPTY_FORM_VALUES: EntryFormValues = {
  selectedOptions: [],
  sliderValues: {},
  content: DEFAULT_MARKDOWN,
  isImportant: false,
  importantReason: '',
};

const EntryView = ({
  selectedMood,
  groups,
  onBack,
  onEntryDeleted,
  onSelectMood,
  editingEntry = null,
  onEntryUpserted,
  onEntrySaved,
  onEditMoodSelect,
}: EntryViewProps) => {
  const isEditing = Boolean(editingEntry);

  const { watch, setValue, reset, getValues } = useForm<EntryFormValues>({
    resolver: zodResolver(entryFormSchema),
    defaultValues: buildDefaultFormValues(editingEntry),
  });
  const { selectedOptions, sliderValues, content: markdownContent, isImportant, importantReason } = watch();

  const [activeEntryId, setActiveEntryId] = useState<number | null>(editingEntry?.id ?? null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState('');
  const [entryDateInput, setEntryDateInput] = useState<string>(() =>
    editingEntry ? dateToInputValue(editingEntry.date) : ''
  );

  const markdownRef = useRef<MarkdownAreaRef | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHydratingEditorRef = useRef(false);
  const latestPayloadRef = useRef<LatestPayload | null>(null);
  const lastSavedSnapshotRef = useRef('');
  const activeEntryIdRef = useRef<number | null>(activeEntryId);
  const createdByAutosaveRef = useRef(false);
  const skipAutosaveFlushRef = useRef(false);
  // Updated each render — safe to call from stale-closure contexts (timeouts)
  const triggerSaveRef = useRef<(payload: SavePayload, snapshot: string) => void>(() => {});

  const { show } = useToast();
  const { isBurnerMode } = useBurner();

  const clearAutosaveTimer = useCallback(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    activeEntryIdRef.current = activeEntryId;
  }, [activeEntryId]);

  const saveMutation = useMutation<MoodCreateResponse | MoodUpdateResponse, Error, MutationVariables>({
    mutationFn: async ({ payload, entryId }) => {
      if (entryId !== null) {
        return apiService.updateMoodEntry(entryId, { ...payload, mood: payload.mood ?? undefined });
      }
      const now = new Date();
      return apiService.createMoodEntry({
        mood: payload.mood as number,
        content: payload.content,
        selected_options: payload.selected_options,
        slider_values: payload.slider_values,
        date: now.toLocaleDateString(),
        time: now.toISOString(),
        is_important: payload.is_important,
        important_reason: payload.important_reason,
      });
    },
    onMutate: () => {
      setSaveState('saving');
      setSaveErrorMessage('');
    },
    onSuccess: (data, variables) => {
      lastSavedSnapshotRef.current = variables.snapshot;
      setLastSavedAt(new Date());
      setSaveState('saved');

      if (variables.entryId === null) {
        const response = data as MoodCreateResponse;
        const newEntryId = response?.entry_id;
        if (newEntryId) {
          setActiveEntryId(newEntryId);
          activeEntryIdRef.current = newEntryId;
          createdByAutosaveRef.current = true;
          const { payload } = variables;
          const now = new Date();
          onEntryUpserted(
            {
              id: newEntryId,
              mood: payload.mood as MoodValue | undefined,
              content: payload.content,
              date: now.toLocaleDateString(),
              created_at: now.toISOString(),
              selections: normalizeSelectedOptions(payload.selected_options).map((id) => ({ id } as Selection)),
              slider_values: normalizeSliderValues(payload.slider_values).map(([gId, val]) => ({ group_id: gId, value: val } as SliderValue)),
              is_important: payload.is_important,
              important_reason: payload.is_important ? payload.important_reason : null,
            },
            { isNew: true }
          );
          if (response?.new_achievements?.length) {
            show('Saved. New achievements unlocked.', 'success');
          }
        }
      } else {
        const response = data as MoodUpdateResponse;
        const { payload } = variables;
        const updatedEntry: Partial<Entry> & { id: number } = response?.entry
          ? { ...response.entry, selections: response.entry.selections ?? [], slider_values: response.entry.slider_values ?? [] }
          : {
              id: variables.entryId,
              mood: payload.mood as MoodValue | undefined,
              content: payload.content,
              selections: normalizeSelectedOptions(payload.selected_options).map((id) => ({ id } as Selection)),
              slider_values: normalizeSliderValues(payload.slider_values).map(([gId, val]) => ({ group_id: gId, value: val } as SliderValue)),
              is_important: payload.is_important,
              important_reason: payload.is_important ? payload.important_reason : null,
            };
        onEntryUpserted(updatedEntry);
      }
    },
    onError: (error) => {
      console.error('Autosave failed:', error);
      setSaveState('error');
      setSaveErrorMessage('Autosave failed. Retrying when changes continue.');
    },
    onSettled: () => {
      const latest = latestPayloadRef.current;
      if (latest && latest.snapshot !== lastSavedSnapshotRef.current) {
        saveMutation.mutate({ payload: latest.payload, snapshot: latest.snapshot, entryId: activeEntryIdRef.current });
      }
    },
  });

  // Kept current each render so setTimeout callbacks always use the latest values
  triggerSaveRef.current = (payload: SavePayload, snapshot: string) => {
    if (isBurnerMode || saveMutation.isPending) return;
    saveMutation.mutate({ payload, snapshot, entryId: activeEntryIdRef.current });
  };

  const hydrateEditor = (markdown: string) => {
    isHydratingEditorRef.current = true;
    const instance = markdownRef.current?.getInstance?.();
    if (instance && typeof instance.setMarkdown === 'function') {
      instance.setMarkdown(markdown);
    }
    queueMicrotask(() => { isHydratingEditorRef.current = false; });
  };

  useEffect(() => {
    if (isEditing && editingEntry) {
      createdByAutosaveRef.current = false;
      skipAutosaveFlushRef.current = false;

      const formValues = buildDefaultFormValues(editingEntry);
      reset(formValues);
      setActiveEntryId(editingEntry.id);
      setEntryDateInput(dateToInputValue(editingEntry.date));

      hydrateEditor(formValues.content);

      lastSavedSnapshotRef.current = buildSnapshot({
        mood: selectedMood ?? editingEntry.mood,
        content: formValues.content,
        selectedOptions: formValues.selectedOptions,
        sliderValues: formValues.sliderValues,
        isImportant: formValues.isImportant,
        importantReason: formValues.importantReason,
      });
      setLastSavedAt(new Date());
      setSaveState(isBurnerMode ? 'disabled' : 'saved');
      setSaveErrorMessage('');
      return;
    }

    reset(EMPTY_FORM_VALUES);
    setActiveEntryId(null);
    createdByAutosaveRef.current = false;
    skipAutosaveFlushRef.current = false;

    hydrateEditor(DEFAULT_MARKDOWN);

    lastSavedSnapshotRef.current = '';
    setLastSavedAt(null);
    setSaveState(isBurnerMode ? 'disabled' : 'idle');
    setSaveErrorMessage('');
  }, [isEditing, editingEntry, isBurnerMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isBurnerMode) {
      clearAutosaveTimer();
      setSaveState('disabled');
      return;
    }
    if (saveState === 'disabled') {
      setSaveState('idle');
    }
  }, [isBurnerMode, saveState, clearAutosaveTimer]);

  const flushPendingSave = useCallback(() => {
    if (skipAutosaveFlushRef.current) return;
    clearAutosaveTimer();
    const latest = latestPayloadRef.current;
    if (!latest || latest.snapshot === lastSavedSnapshotRef.current) return;
    if (saveMutation.isPending) return; // onSettled will retry
    saveMutation.mutate({ payload: latest.payload, snapshot: latest.snapshot, entryId: activeEntryIdRef.current });
  }, [clearAutosaveTimer, saveMutation]);

  useEffect(() => {
    return () => { clearAutosaveTimer(); };
  }, [clearAutosaveTimer]);

  useEffect(() => {
    return () => { flushPendingSave(); };
  }, [flushPendingSave]);

  useEffect(() => {
    if (isBurnerMode) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingSave();
      }
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (saveState === 'dirty' || saveState === 'saving') {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [flushPendingSave, isBurnerMode, saveState]);

  useEffect(() => {
    clearAutosaveTimer();

    const trimmedReason = importantReason.trim();
    const effectiveIsImportant = isImportant && trimmedReason.length > 0;

    const payload: SavePayload = {
      mood: selectedMood ? Number(selectedMood) : null,
      content: markdownContent || '',
      selected_options: normalizeSelectedOptions(selectedOptions),
      slider_values: sliderValues,
      is_important: effectiveIsImportant,
      important_reason: effectiveIsImportant ? trimmedReason : '',
    };
    const snapshot = buildSnapshot({
      mood: payload.mood,
      content: payload.content,
      selectedOptions: payload.selected_options,
      sliderValues: payload.slider_values,
      isImportant: payload.is_important,
      importantReason: payload.important_reason,
    });

    latestPayloadRef.current = { payload, snapshot };

    if (isBurnerMode) {
      setSaveState('disabled');
      return;
    }

    if (!payload.mood) {
      setSaveState('idle');
      return;
    }

    if (snapshot === lastSavedSnapshotRef.current) {
      if (!saveMutation.isPending) {
        setSaveState('saved');
      }
      return;
    }

    setSaveState('dirty');

    autosaveTimerRef.current = setTimeout(() => {
      const latest = latestPayloadRef.current;
      if (!latest || latest.snapshot === lastSavedSnapshotRef.current) return;
      triggerSaveRef.current(latest.payload, latest.snapshot);
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => { clearAutosaveTimer(); };
  }, [selectedMood, selectedOptions, sliderValues, markdownContent, isImportant, importantReason, isBurnerMode, saveMutation.isPending, clearAutosaveTimer]);

  const handleOptionToggle = (optionId: number) => {
    const current = getValues('selectedOptions');
    const next = current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId];
    setValue('selectedOptions', next, { shouldDirty: true });
  };

  const handleSliderChange = (groupId: number, value: number | undefined) => {
    const current = getValues('sliderValues');
    if (value === undefined) {
      if (!(groupId in current)) return;
      const next = { ...current };
      delete next[groupId];
      setValue('sliderValues', next, { shouldDirty: true });
      return;
    }
    setValue('sliderValues', { ...current, [groupId]: value }, { shouldDirty: true });
  };

  const handleMoodSelection = (moodValue: MoodValue) => {
    if (isEditing) {
      onEditMoodSelect?.(moodValue);
    } else {
      onSelectMood(moodValue);
    }
  };

  const handleEditorChange = (nextMarkdown: string) => {
    if (isHydratingEditorRef.current) return;
    setValue('content', nextMarkdown || '', { shouldDirty: true });
  };

  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newInput = e.target.value;
    setEntryDateInput(newInput);
    if (!newInput || !activeEntryIdRef.current) return;
    const newDisplayDate = inputValueToDisplayDate(newInput);
    try {
      await apiService.updateMoodEntry(activeEntryIdRef.current, { date: newDisplayDate });
      onEntryUpserted({ id: activeEntryIdRef.current, date: newDisplayDate });
      show('Date updated', 'success');
    } catch {
      show('Failed to update date', 'error');
    }
  };

  const resetDraftComposer = () => {
    hydrateEditor(DEFAULT_MARKDOWN);
    reset(EMPTY_FORM_VALUES);
    setSaveErrorMessage('');
    setSaveState('disabled');

    const resetSnapshot = buildSnapshot({
      mood: selectedMood, content: DEFAULT_MARKDOWN, selectedOptions: [], sliderValues: {},
      isImportant: false, importantReason: '',
    });
    lastSavedSnapshotRef.current = resetSnapshot;
    latestPayloadRef.current = {
      payload: { mood: selectedMood ? Number(selectedMood) : null, content: DEFAULT_MARKDOWN, selected_options: [], slider_values: {}, is_important: false, important_reason: '' },
      snapshot: resetSnapshot,
    };
  };

  const handleCancel = async () => {
    clearAutosaveTimer();
    skipAutosaveFlushRef.current = true;

    if (isBurnerMode && !isEditing) {
      resetDraftComposer();
    }

    if (!isEditing && createdByAutosaveRef.current && activeEntryIdRef.current) {
      if (!window.confirm('Discard this draft?')) {
        skipAutosaveFlushRef.current = false;
        return;
      }
      try {
        const draftId = activeEntryIdRef.current;
        await apiService.deleteMoodEntry(draftId);
        onEntryDeleted(draftId);
      } catch (error) {
        console.error('Failed to discard draft:', error);
        show('Could not discard the draft. Please try again.', 'error');
        skipAutosaveFlushRef.current = false;
        return;
      }
    }

    onBack();
  };

  const handleSaveAndClose = useCallback(() => {
    clearAutosaveTimer();
    skipAutosaveFlushRef.current = true;

    const latest = latestPayloadRef.current;
    if (latest && latest.snapshot !== lastSavedSnapshotRef.current && !saveMutation.isPending) {
      saveMutation.mutate({ payload: latest.payload, snapshot: latest.snapshot, entryId: activeEntryIdRef.current });
    }

    onEntrySaved();
  }, [clearAutosaveTimer, saveMutation, onEntrySaved]);

  const handleRetryAutosave = useCallback(() => {
    if (saveState !== 'error') return;
    const latest = latestPayloadRef.current;
    if (!latest) return;
    saveMutation.mutate({ payload: latest.payload, snapshot: latest.snapshot, entryId: activeEntryIdRef.current });
  }, [saveState, saveMutation]);

  const saveStatusMeta: { label: string; Icon: ComponentType<LucideProps> } = (() => {
    if (isBurnerMode) return { label: 'Saving is turned off in burner mode.', Icon: CloudOff };
    if (saveState === 'saving') return { label: 'Saving...', Icon: Loader2 };
    if (saveState === 'dirty') return { label: 'Unsaved changes', Icon: AlertCircle };
    if (saveState === 'error') return { label: saveErrorMessage || 'Autosave error — tap to retry', Icon: AlertCircle };
    if (saveState === 'saved') {
      const timestamp = lastSavedAt
        ? lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';
      return { label: timestamp ? `Saved at ${timestamp}` : 'All changes saved', Icon: CheckCircle2 };
    }
    return { label: 'Waiting for changes', Icon: Clock3 };
  })();

  const showSaveButton = !isBurnerMode && (isEditing || saveState !== 'idle');

  if (!selectedMood && !isEditing) {
    return (
      <div style={{ marginTop: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>Pick your mood to start an entry</h3>
        <MoodPicker onMoodSelect={handleMoodSelection} />
      </div>
    );
  }

  return (
    <div className="entry-container" style={{ position: 'relative' }}>
      <div className="entry-grid">
        <div className="entry-left">
          {isEditing && editingEntry && (
            <div style={{
              marginBottom: '0.75rem',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap',
            }}>
              <span style={{ color: 'color-mix(in oklab, var(--text), transparent 40%)' }}>Entry date:</span>
              <input
                type="date"
                value={entryDateInput}
                onChange={handleDateChange}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '2px 6px',
                  fontSize: '0.85rem',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          )}
          <div style={{
            marginBottom: '1rem',
            fontSize: '0.85rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}>
            <label style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              userSelect: 'none',
              width: 'fit-content',
            }}>
              <input
                type="checkbox"
                checked={isImportant}
                onChange={(e) => setValue('isImportant', e.target.checked, { shouldDirty: true })}
                style={{ cursor: 'pointer' }}
              />
              <Star
                size={15}
                strokeWidth={1.75}
                style={{ color: 'var(--important-color)', fill: isImportant ? 'var(--important-color)' : 'none' }}
                aria-hidden="true"
              />
              <span style={{ color: isImportant ? 'var(--important-color-2)' : 'var(--text)', fontWeight: isImportant ? 600 : 400 }}>
                Mark this day as important
              </span>
            </label>
            {isImportant && (
              <input
                type="text"
                value={importantReason}
                onChange={(e) => setValue('importantReason', e.target.value, { shouldDirty: true })}
                placeholder="Why is this day important? (e.g. Birthday, Anniversary…)"
                style={{
                  border: '1px solid var(--important-border)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '0.85rem',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  fontFamily: 'inherit',
                }}
              />
            )}
            {isImportant && !importantReason.trim() && (
              <span style={{ color: 'color-mix(in oklab, var(--text), transparent 40%)', fontSize: '0.78rem' }}>
                Add a reason — it'll be saved along with your entry.
              </span>
            )}
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <MoodDisplay moodValue={selectedMood as MoodValue} showLabel={false}>
              <div className="entry-mood-actions">
                <button
                  type="button"
                  className="entry-icon-button"
                  onClick={handleCancel}
                  aria-label="Back"
                  title="Back"
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                </button>
                <div
                  className={`entry-autosave-status is-${saveState}${saveState === 'error' ? ' is-clickable' : ''}`}
                  role="status"
                  aria-live="polite"
                  onClick={saveState === 'error' ? handleRetryAutosave : undefined}
                  style={saveState === 'error' ? { cursor: 'pointer' } : undefined}
                  title={saveState === 'error' ? 'Click to retry' : undefined}
                >
                  <saveStatusMeta.Icon
                    size={16}
                    className={saveState === 'saving' ? 'is-spinning' : ''}
                    aria-hidden="true"
                  />
                  <span>{saveStatusMeta.label}</span>
                </div>
                {showSaveButton && (
                  <button
                    type="button"
                    className="entry-save-button"
                    onClick={handleSaveAndClose}
                    disabled={saveMutation.isPending}
                    aria-label={isEditing ? 'Save changes' : 'Save entry'}
                    title={isEditing ? 'Save changes' : 'Save entry'}
                  >
                    <Save size={14} aria-hidden="true" />
                    <span>{isEditing ? 'Save changes' : 'Save entry'}</span>
                  </button>
                )}
              </div>
            </MoodDisplay>
          </div>
          {activeEntryId && (
            <MoodLogList
              entryId={activeEntryId}
              onMoodUpdated={(newMood) => onEditMoodSelect?.(newMood)}
            />
          )}
          {groups.length > 0 && (
            <p style={{
              margin: '0.75rem 0 0.25rem',
              fontSize: '0.8rem',
              color: 'color-mix(in oklab, var(--text), transparent 40%)',
            }}>
              What shaped your mood today? Sleep, people, work, movement — whatever stands out.
            </p>
          )}
          <GroupSelector
            groups={groups}
            selectedOptions={selectedOptions}
            onOptionToggle={handleOptionToggle}
            sliderValues={sliderValues}
            onSliderChange={handleSliderChange}
          />
        </div>

        <div className="entry-right">
          <ReflectionPrompt />
          <MDArea
            ref={markdownRef}
            initialMarkdown={editingEntry?.content || DEFAULT_MARKDOWN}
            onChange={handleEditorChange}
          />
        </div>
      </div>
    </div>
  );
};

export default EntryView;
