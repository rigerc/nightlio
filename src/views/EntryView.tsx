import { useRef, useEffect, useState } from 'react';
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
import type { MoodValue, Entry, Group } from '../types';
import { buildSnapshot, useEntryDraft } from '../hooks/useEntryDraft';
import type { SavePayload } from '../hooks/useEntryDraft';

const DEFAULT_MARKDOWN = '';
const toDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const dateToInputValue = (displayDate: string): string => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(displayDate)) return displayDate;
  const d = new Date(displayDate);
  if (isNaN(d.getTime())) return '';
  return toDateKey(d);
};

const inputValueToDisplayDate = (isoDate: string): string => isoDate;

const entryFormSchema = z.object({
  selectedOptions: z.array(z.number()),
  sliderValues: z.record(z.coerce.number(), z.number()),
  content: z.string(),
  isImportant: z.boolean(),
  importantReason: z.string(),
});

type EntryFormValues = z.infer<typeof entryFormSchema>;

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

const normalizeSelectedOptions = (optionIds: number[] = []): number[] =>
  [...optionIds].map((id) => Number(id)).filter((id) => Number.isFinite(id)).sort((a, b) => a - b);

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

  const [entryDateInput, setEntryDateInput] = useState<string>(() =>
    editingEntry ? dateToInputValue(editingEntry.date) : ''
  );

  const markdownRef = useRef<MarkdownAreaRef | null>(null);
  const isHydratingEditorRef = useRef(false);

  const { show } = useToast();
  const { isBurnerMode } = useBurner();

  const hydrateEditor = (markdown: string) => {
    isHydratingEditorRef.current = true;
    const instance = markdownRef.current?.getInstance?.();
    if (instance && typeof instance.setMarkdown === 'function') {
      instance.setMarkdown(markdown);
    }
    queueMicrotask(() => { isHydratingEditorRef.current = false; });
  };

  const resetFormAndEditor = () => {
    hydrateEditor(DEFAULT_MARKDOWN);
    reset(EMPTY_FORM_VALUES);
  };

  const draft = useEntryDraft({
    editingEntry,
    selectedMood,
    isBurnerMode,
    isEditing,
    onEntryUpserted,
    onEntryDeleted,
    onBack,
    onEntrySaved,
    onResetForm: resetFormAndEditor,
    show,
  });

  useEffect(() => {
    if (isEditing && editingEntry) {
      const formValues = buildDefaultFormValues(editingEntry);
      reset(formValues);
      setEntryDateInput(dateToInputValue(editingEntry.date));
      hydrateEditor(formValues.content);
      draft.initializeDraft(editingEntry, selectedMood);
      return;
    }

    reset(EMPTY_FORM_VALUES);
    hydrateEditor(DEFAULT_MARKDOWN);
    draft.initializeDraft(null, selectedMood);
  }, [isEditing, editingEntry, isBurnerMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
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

    draft.onFormChange(payload, snapshot);
  }, [selectedMood, selectedOptions, sliderValues, markdownContent, isImportant, importantReason, isBurnerMode, draft.isMutationPending]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!newInput || !draft.activeEntryId) return;
    const newDisplayDate = inputValueToDisplayDate(newInput);
    try {
      await apiService.updateMoodEntry(draft.activeEntryId, { date: newDisplayDate });
      onEntryUpserted({ id: draft.activeEntryId, date: newDisplayDate });
      show('Date updated', 'success');
    } catch {
      show('Failed to update date', 'error');
    }
  };

  const { saveState, lastSavedAt, saveErrorMessage, isMutationPending } = draft;

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
                  onClick={() => void draft.handleCancel()}
                  aria-label="Back"
                  title="Back"
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                </button>
                <div
                  className={`entry-autosave-status is-${saveState}${saveState === 'error' ? ' is-clickable' : ''}`}
                  role="status"
                  aria-live="polite"
                  onClick={saveState === 'error' ? draft.handleRetryAutosave : undefined}
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
                    onClick={() => void draft.handleSaveAndClose()}
                    disabled={isMutationPending}
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
          {draft.activeEntryId && (
            <MoodLogList
              entryId={draft.activeEntryId}
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
