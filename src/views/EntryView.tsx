import { useState, useRef, useEffect, useCallback } from 'react';
import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  CloudOff,
  Loader2,
} from 'lucide-react';
import MoodPicker from '../components/mood/MoodPicker';
import MoodDisplay from '../components/mood/MoodDisplay';
import GroupSelector from '../components/groups/GroupSelector';
import GroupManager from '../components/groups/GroupManager';
import MDArea from '../components/MarkdownArea';
import type { MarkdownAreaRef } from '../components/MarkdownArea';
import apiService from '../services/api';
import { useToast } from '../components/ui/ToastProvider';
import { useBurner } from '../contexts/BurnerContext';
import type { MoodValue, Entry, Group, Selection } from '../types';

const DEFAULT_MARKDOWN = '';
const DEFAULT_MARKDOWN_TRIMMED = DEFAULT_MARKDOWN.trim();

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

interface SavePayload {
  mood: number | null;
  content: string;
  selected_options: number[];
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
  onCreateGroup: (name: string) => Promise<boolean>;
  onCreateOption: (groupId: number, name: string) => Promise<boolean>;
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

const buildSnapshot = ({
  mood,
  content,
  selectedOptions,
}: {
  mood: number | null | undefined;
  content: string;
  selectedOptions: number[];
}): string =>
  JSON.stringify({
    mood: mood ?? null,
    content: content ?? '',
    selected_options: normalizeSelectedOptions(selectedOptions),
  });

const EntryView = ({
  selectedMood,
  groups,
  onBack,
  onEntryDeleted,
  onCreateGroup,
  onCreateOption,
  onSelectMood,
  editingEntry = null,
  onEntryUpdated,
  onEditMoodSelect,
}: EntryViewProps) => {
  const isEditing = Boolean(editingEntry);
  const initialSelectionIds = editingEntry?.selections?.map((s) => s.id) ?? [];

  const [selectedOptions, setSelectedOptions] = useState<number[]>(initialSelectionIds);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [markdownContent, setMarkdownContent] = useState(editingEntry?.content || DEFAULT_MARKDOWN);
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

  useEffect(() => {
    if (isEditing && editingEntry) {
      createdByAutosaveRef.current = false;
      skipAutosaveFlushRef.current = false;

      const selectionIds = editingEntry.selections?.map((s) => s.id) ?? [];
      const content = editingEntry.content || '';

      setSelectedOptions(selectionIds);
      setActiveEntryId(editingEntry.id);
      setMarkdownContent(content);
      setEntryDateInput(dateToInputValue(editingEntry.date));

      isHydratingEditorRef.current = true;
      const instance = markdownRef.current?.getInstance?.();
      if (instance && typeof instance.setMarkdown === 'function') {
        instance.setMarkdown(content);
      }
      queueMicrotask(() => { isHydratingEditorRef.current = false; });

      lastSavedSnapshotRef.current = buildSnapshot({
        mood: selectedMood ?? editingEntry.mood,
        content,
        selectedOptions: selectionIds,
      });
      setLastSavedAt(new Date());
      setSaveState(isBurnerMode ? 'disabled' : 'saved');
      setSaveErrorMessage('');
      return;
    }

    setSelectedOptions([]);
    setActiveEntryId(null);
    setMarkdownContent(DEFAULT_MARKDOWN);
    createdByAutosaveRef.current = false;
    skipAutosaveFlushRef.current = false;

    isHydratingEditorRef.current = true;
    const instance = markdownRef.current?.getInstance?.();
    if (instance && typeof instance.setMarkdown === 'function') {
      instance.setMarkdown(DEFAULT_MARKDOWN);
    }
    queueMicrotask(() => { isHydratingEditorRef.current = false; });

    lastSavedSnapshotRef.current = buildSnapshot({
      mood: selectedMood,
      content: DEFAULT_MARKDOWN,
      selectedOptions: [],
    });
    setLastSavedAt(null);
    setSaveState(isBurnerMode ? 'disabled' : 'idle');
    setSaveErrorMessage('');
  }, [isEditing, editingEntry, isBurnerMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isEditing) {
      setShowMoodPicker(false);
    }
  }, [isEditing]);

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
            ? { ...response.entry, selections: response.entry.selections ?? [] }
            : {
                id: entryId,
                mood: payload.mood as MoodValue | undefined,
                content: payload.content,
                selections: normalizeSelectedOptions(payload.selected_options).map((id) => ({ id } as Selection)),
              };
          onEntryUpdated(updatedEntry, { navigateAfterSave: false, refreshAfterSave: false });
        } else {
          const now = new Date();
          const createPayload = {
            mood: payload.mood as number,
            content: payload.content,
            selected_options: payload.selected_options,
            date: now.toLocaleDateString(),
            time: now.toISOString(),
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

    const payload: SavePayload = {
      mood: selectedMood ? Number(selectedMood) : null,
      content: markdownContent || '',
      selected_options: normalizeSelectedOptions(selectedOptions),
    };
    const snapshot = buildSnapshot({
      mood: payload.mood,
      content: payload.content,
      selectedOptions: payload.selected_options,
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

    const trimmed = payload.content.trim();
    const hasMeaningfulContent = Boolean(trimmed) && trimmed !== DEFAULT_MARKDOWN_TRIMMED;

    if (!hasMeaningfulContent) {
      setSaveState(activeEntryIdRef.current ? 'saved' : 'idle');
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
  }, [selectedMood, selectedOptions, markdownContent, isBurnerMode, executeAutosave, clearAutosaveTimer]);

  const handleOptionToggle = (optionId: number) => {
    setSelectedOptions((prev) =>
      prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
    );
  };

  const handleMoodSelection = (moodValue: MoodValue) => {
    if (isEditing) {
      onEditMoodSelect?.(moodValue);
      setShowMoodPicker(false);
    } else {
      onSelectMood(moodValue);
    }
  };

  const handleEditorChange = (nextMarkdown: string) => {
    if (isHydratingEditorRef.current) return;
    setMarkdownContent(nextMarkdown || '');
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
    isHydratingEditorRef.current = true;
    markdownRef.current?.getInstance?.()?.setMarkdown(DEFAULT_MARKDOWN);
    queueMicrotask(() => { isHydratingEditorRef.current = false; });

    setMarkdownContent(DEFAULT_MARKDOWN);
    setSelectedOptions([]);
    setShowMoodPicker(false);
    setSaveErrorMessage('');
    setSaveState('disabled');

    const resetSnapshot = buildSnapshot({ mood: selectedMood, content: DEFAULT_MARKDOWN, selectedOptions: [] });
    lastSavedSnapshotRef.current = resetSnapshot;
    latestPayloadRef.current = {
      payload: { mood: selectedMood ? Number(selectedMood) : null, content: DEFAULT_MARKDOWN, selected_options: [] },
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
            {isEditing && (
              <button
                type="button"
                onClick={() => setShowMoodPicker(true)}
                style={{
                  marginTop: '0.75rem',
                  padding: '0.4rem 0.9rem',
                  borderRadius: '999px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                }}
              >
                Change mood
              </button>
            )}
          </div>
          {isEditing && showMoodPicker && (
            <div style={{
              marginBottom: '1rem',
              padding: '1rem',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <p style={{ marginTop: 0, marginBottom: '0.75rem', fontWeight: 600, color: 'var(--text)' }}>
                Pick a new mood
              </p>
              <MoodPicker onMoodSelect={handleMoodSelection} />
              <div style={{ marginTop: '0.75rem', textAlign: 'right' }}>
                <button
                  type="button"
                  onClick={() => setShowMoodPicker(false)}
                  style={{
                    padding: '0.35rem 0.85rem',
                    borderRadius: '999px',
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    color: 'color-mix(in oklab, var(--text), transparent 30%)',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          <GroupSelector
            groups={groups}
            selectedOptions={selectedOptions}
            onOptionToggle={handleOptionToggle}
          />
          <div style={{ marginTop: '1rem' }}>
            <GroupManager
              groups={groups}
              onCreateGroup={onCreateGroup}
              onCreateOption={onCreateOption}
            />
          </div>
        </div>

        <div className="entry-right">
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
