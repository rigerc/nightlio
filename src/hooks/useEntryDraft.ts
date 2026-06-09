import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import apiService from '../services/api';
import type { Entry, MoodCreateResponse, MoodUpdateResponse, MoodValue, Selection, SliderValue } from '../types';

export type SaveState = 'idle' | 'saving' | 'dirty' | 'error' | 'saved' | 'disabled';

export interface SavePayload {
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

const toDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const normalizeSelectedOptions = (optionIds: number[] = []): number[] =>
  [...optionIds].map((id) => Number(id)).filter((id) => Number.isFinite(id)).sort((a, b) => a - b);

const normalizeSliderValues = (values: Record<number, number> = {}): [number, number][] =>
  Object.entries(values)
    .map(([groupId, value]) => [Number(groupId), Number(value)] as [number, number])
    .filter(([groupId, value]) => Number.isFinite(groupId) && Number.isFinite(value))
    .sort((a, b) => a[0] - b[0]);

export const buildSnapshot = ({
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

export const AUTOSAVE_DEBOUNCE_MS = 1200;

interface UseEntryDraftOptions {
  editingEntry: Entry | null;
  selectedMood: MoodValue | undefined;
  isBurnerMode: boolean;
  isEditing: boolean;
  onEntryUpserted: (entry: Partial<Entry> & { id: number }, opts?: { isNew?: boolean }) => void;
  onEntryDeleted: (id: number) => void;
  onBack: () => void;
  onEntrySaved: () => void;
  onResetForm?: () => void;
  show: (message: string, type: 'success' | 'error') => void;
}

export function useEntryDraft({
  editingEntry,
  selectedMood,
  isBurnerMode,
  isEditing,
  onEntryUpserted,
  onEntryDeleted,
  onBack,
  onEntrySaved,
  onResetForm,
  show,
}: UseEntryDraftOptions) {
  const [activeEntryId, setActiveEntryId] = useState<number | null>(editingEntry?.id ?? null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState('');

  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestPayloadRef = useRef<LatestPayload | null>(null);
  const lastSavedSnapshotRef = useRef('');
  const activeEntryIdRef = useRef<number | null>(activeEntryId);
  const createdByAutosaveRef = useRef(false);
  const skipAutosaveFlushRef = useRef(false);
  // Updated each render so setTimeout callbacks always read the latest values
  const triggerSaveRef = useRef<(payload: SavePayload, snapshot: string) => void>(() => {});

  useEffect(() => {
    activeEntryIdRef.current = activeEntryId;
  }, [activeEntryId]);

  const clearAutosaveTimer = useCallback(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  }, []);

  const saveMutation = useMutation<MoodCreateResponse | MoodUpdateResponse, Error, LatestPayload & { entryId: number | null }>({
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
        date: toDateKey(now),
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
              date: toDateKey(now),
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

  const flushPendingSave = useCallback(() => {
    if (skipAutosaveFlushRef.current) return;
    clearAutosaveTimer();
    const latest = latestPayloadRef.current;
    if (!latest || latest.snapshot === lastSavedSnapshotRef.current) return;
    if (saveMutation.isPending) return;
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
      if (document.visibilityState === 'hidden') flushPendingSave();
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

  // Called by EntryView's watch effect whenever form values change
  const onFormChange = useCallback((payload: SavePayload, snapshot: string) => {
    clearAutosaveTimer();
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
      if (!saveMutation.isPending) setSaveState('saved');
      return;
    }

    setSaveState('dirty');
    autosaveTimerRef.current = setTimeout(() => {
      const latest = latestPayloadRef.current;
      if (!latest || latest.snapshot === lastSavedSnapshotRef.current) return;
      triggerSaveRef.current(latest.payload, latest.snapshot);
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [clearAutosaveTimer, isBurnerMode, saveMutation.isPending]);

  // Called by EntryView when editingEntry changes (new/edit mode switch)
  const initializeDraft = useCallback((entry: Entry | null, mood: MoodValue | undefined) => {
    clearAutosaveTimer();
    createdByAutosaveRef.current = false;
    skipAutosaveFlushRef.current = false;

    if (entry) {
      setActiveEntryId(entry.id);
      activeEntryIdRef.current = entry.id;
      lastSavedSnapshotRef.current = buildSnapshot({
        mood: mood ?? entry.mood,
        content: entry.content || '',
        selectedOptions: entry.selections?.map((s) => s.id) ?? [],
        sliderValues: Object.fromEntries((entry.slider_values ?? []).map((sv) => [sv.group_id, sv.value])),
        isImportant: entry.is_important ?? false,
        importantReason: entry.important_reason ?? '',
      });
      setLastSavedAt(new Date());
      setSaveState(isBurnerMode ? 'disabled' : 'saved');
    } else {
      setActiveEntryId(null);
      activeEntryIdRef.current = null;
      lastSavedSnapshotRef.current = '';
      setLastSavedAt(null);
      setSaveState(isBurnerMode ? 'disabled' : 'idle');
    }
    setSaveErrorMessage('');
  }, [clearAutosaveTimer, isBurnerMode]);

  const handleCancel = useCallback(async () => {
    clearAutosaveTimer();
    skipAutosaveFlushRef.current = true;

    if (isBurnerMode && !isEditing) {
      // Reset the form/editor back to blank in burner mode
      const resetSnapshot = buildSnapshot({
        mood: selectedMood, content: '', selectedOptions: [], sliderValues: {},
        isImportant: false, importantReason: '',
      });
      lastSavedSnapshotRef.current = resetSnapshot;
      latestPayloadRef.current = {
        payload: { mood: selectedMood ? Number(selectedMood) : null, content: '', selected_options: [], slider_values: {}, is_important: false, important_reason: '' },
        snapshot: resetSnapshot,
      };
      setSaveState('disabled');
      setSaveErrorMessage('');
      onResetForm?.();
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
  }, [clearAutosaveTimer, isBurnerMode, isEditing, selectedMood, onResetForm, onEntryDeleted, onBack, show]);

  const handleSaveAndClose = useCallback(async () => {
    clearAutosaveTimer();
    skipAutosaveFlushRef.current = true;

    const latest = latestPayloadRef.current;
    try {
      if (latest && latest.snapshot !== lastSavedSnapshotRef.current && !saveMutation.isPending) {
        await saveMutation.mutateAsync({ payload: latest.payload, snapshot: latest.snapshot, entryId: activeEntryIdRef.current });
      }
      onEntrySaved();
    } catch (error) {
      skipAutosaveFlushRef.current = false;
      setSaveState('error');
      setSaveErrorMessage(error instanceof Error ? error.message : 'Save failed. Please try again.');
    }
  }, [clearAutosaveTimer, saveMutation, onEntrySaved]);

  const handleRetryAutosave = useCallback(() => {
    if (saveState !== 'error') return;
    const latest = latestPayloadRef.current;
    if (!latest) return;
    saveMutation.mutate({ payload: latest.payload, snapshot: latest.snapshot, entryId: activeEntryIdRef.current });
  }, [saveState, saveMutation]);

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

  return {
    activeEntryId,
    saveState,
    lastSavedAt,
    saveErrorMessage,
    isMutationPending: saveMutation.isPending,
    onFormChange,
    initializeDraft,
    handleCancel,
    handleSaveAndClose,
    handleRetryAutosave,
  };
}
