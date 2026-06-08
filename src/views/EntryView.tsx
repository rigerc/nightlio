import { useRef, useEffect, useCallback, useState } from 'react';
import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  CloudOff,
  Loader2,
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
import type { MoodValue, Entry, Group, Selection, SliderValue } from '../types';

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

interface EntryViewProps {
  selectedMood?: MoodValue;
  groups: Group[];
  onBack: () => void;
  onEntryDeleted: (id: number) => void;
  onSelectMood: (moodValue: MoodValue) => void;
  editingEntry?: Entry | null;
  onEntryUpdated: (
    entry: Partial<Entry> & { id: number },
    options?: { navigateAfterSave?: boolean; refreshAfterSave?: boolean }
  ) => void;
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
  onEntryUpdated,
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
  const saveInFlightRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const latestPayloadRef = useRef<LatestPayload | null>(null);
  const lastSavedSnapshotRef = useRef('');
  const activeEntryIdRef = useRef<number | null>(activeEntryId);
  const createdByAutosaveRef = useRef(false);
  const skipAutosaveFlushRef = useRef(false);

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

  const executeAutosave = useCallback(
    async (payload: SavePayload, snapshot: string, silentError = false): Promise<boolean> => {
      if (isBurnerMode) return false;

      if (saveInFlightRef.current) {
        pendingSaveRef.current = true;
        return false;
      }

      saveInFlightRef.current = true;
      setSaveState('saving');
      setSaveErrorMessage('');

      try {
        if (activeEntryIdRef.current) {
          const entryId = activeEntryIdRef.current;
          const response = await apiService.updateMoodEntry(entryId, { ...payload, mood: payload.mood ?? undefined });
          const updatedEntry: Partial<Entry> & { id: number } = response?.entry
            ? { ...response.entry, selections: response.entry.selections ?? [], slider_values: response.entry.slider_values ?? [] }
            : {
                id: entryId,
                mood: payload.mood as MoodValue | undefined,
                content: payload.content,
                selections: normalizeSelectedOptions(payload.selected_options).map((id) => ({ id } as Selection)),
                slider_values: normalizeSliderValues(payload.slider_values).map(([groupId, value]) => ({ group_id: groupId, value } as SliderValue)),
                is_important: payload.is_important,
                important_reason: payload.is_important ? payload.important_reason : null,
              };
          onEntryUpdated(updatedEntry, { navigateAfterSave: false, refreshAfterSave: false });
        } else {
          const now = new Date();
          const createPayload = {
            mood: payload.mood as number,
            content: payload.content,
            selected_options: payload.selected_options,
            slider_values: payload.slider_values,
            date: now.toLocaleDateString(),
            time: now.toISOString(),
            is_important: payload.is_important,
            important_reason: payload.important_reason,
          };

          const response = await apiService.createMoodEntry(createPayload);
          const newEntryId = response?.entry_id;

          if (newEntryId) {
            setActiveEntryId(newEntryId);
            activeEntryIdRef.current = newEntryId;
            createdByAutosaveRef.current = true;

            onEntryUpdated(
              {
                id: newEntryId,
                mood: payload.mood as MoodValue | undefined,
                content: payload.content,
                date: createPayload.date,
                created_at: createPayload.time,
                selections: normalizeSelectedOptions(payload.selected_options).map((id) => ({ id } as Selection)),
                slider_values: normalizeSliderValues(payload.slider_values).map(([groupId, value]) => ({ group_id: groupId, value } as SliderValue)),
                is_important: payload.is_important,
                important_reason: payload.is_important ? payload.important_reason : null,
              },
              { navigateAfterSave: false, refreshAfterSave: true }
            );
          }

          if (response?.new_achievements?.length) {
            show('Saved. New achievements unlocked.', 'success');
          }
        }

        lastSavedSnapshotRef.current = snapshot;
        setLastSavedAt(new Date());
        setSaveState('saved');
        return true;
      } catch (error) {
        console.error('Autosave failed:', error);
        setSaveState('error');
        setSaveErrorMessage('Autosave failed. Retrying when changes continue.');
        if (!silentError) {
          show('Autosave failed. Your changes are still in the editor.', 'error');
        }
        return false;
      } finally {
        saveInFlightRef.current = false;
        if (pendingSaveRef.current) {
          pendingSaveRef.current = false;
          const latest = latestPayloadRef.current;
          if (latest && latest.snapshot !== lastSavedSnapshotRef.current) {
            void executeAutosave(latest.payload, latest.snapshot, true);
          }
        }
      }
    },
    [isBurnerMode, onEntryUpdated, show]
  );

  const flushPendingSave = useCallback(async (): Promise<boolean> => {
    if (skipAutosaveFlushRef.current) return true;
    clearAutosaveTimer();
    const latest = latestPayloadRef.current;
    if (!latest) return true;
    if (latest.snapshot === lastSavedSnapshotRef.current) return true;
    return executeAutosave(latest.payload, latest.snapshot);
  }, [clearAutosaveTimer, executeAutosave]);

  useEffect(() => {
    return () => { clearAutosaveTimer(); };
  }, [clearAutosaveTimer]);

  useEffect(() => {
    return () => {
      if (!skipAutosaveFlushRef.current) {
        void flushPendingSave();
      }
    };
  }, [flushPendingSave]);

  useEffect(() => {
    if (isBurnerMode) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void flushPendingSave();
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
      if (!saveInFlightRef.current) {
        setSaveState('saved');
      }
      return;
    }

    setSaveState('dirty');

    autosaveTimerRef.current = setTimeout(() => {
      const latest = latestPayloadRef.current;
      if (!latest) return;
      if (latest.snapshot === lastSavedSnapshotRef.current) return;
      void executeAutosave(latest.payload, latest.snapshot);
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => { clearAutosaveTimer(); };
  }, [selectedMood, selectedOptions, sliderValues, markdownContent, isImportant, importantReason, isBurnerMode, executeAutosave, clearAutosaveTimer]);

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
      onEntryUpdated({ id: activeEntryIdRef.current, date: newDisplayDate }, { navigateAfterSave: false, refreshAfterSave: false });
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

    if (!isEditing && !isBurnerMode && saveInFlightRef.current && !activeEntryIdRef.current) {
      show('Autosave is still finishing. Please tap Cancel again in a moment.', 'info');
      return;
    }

    skipAutosaveFlushRef.current = true;

    if (isBurnerMode && !isEditing) {
      resetDraftComposer();
    }

    if (!isEditing && createdByAutosaveRef.current && activeEntryIdRef.current) {
      try {
        const draftId = activeEntryIdRef.current;
        await apiService.deleteMoodEntry(draftId);
        onEntryDeleted(draftId);
        show('Draft discarded.', 'success');
      } catch (error) {
        console.error('Failed to discard autosaved draft:', error);
        skipAutosaveFlushRef.current = false;
        show('Could not discard the autosaved draft. Please try again.', 'error');
        return;
      }
    }

    onBack();
  };

  const saveStatusMeta: { label: string; Icon: ComponentType<LucideProps> } = (() => {
    if (isBurnerMode) return { label: 'Saving is turned off in burner mode.', Icon: CloudOff };
    if (saveState === 'saving') return { label: 'Saving...', Icon: Loader2 };
    if (saveState === 'dirty') return { label: 'Unsaved changes', Icon: AlertCircle };
    if (saveState === 'error') return { label: saveErrorMessage || 'Autosave error', Icon: AlertCircle };
    if (saveState === 'saved') {
      const timestamp = lastSavedAt
        ? lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';
      return { label: timestamp ? `Saved at ${timestamp}` : 'All changes saved', Icon: CheckCircle2 };
    }
    return { label: 'Waiting for changes', Icon: Clock3 };
  })();

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
                  aria-label="Cancel"
                  title="Cancel"
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                </button>
                <div className={`entry-autosave-status is-${saveState}`} role="status" aria-live="polite">
                  <saveStatusMeta.Icon
                    size={16}
                    className={saveState === 'saving' ? 'is-spinning' : ''}
                    aria-hidden="true"
                  />
                  <span>{saveStatusMeta.label}</span>
                </div>
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
