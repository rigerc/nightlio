import { useEffect, useRef, useState } from 'react';
import { Star } from 'lucide-react';
import { getMoodIcon } from '../../utils/moodUtils';
import { usePreferences } from '../../contexts/PreferencesContext';
import { getIconComponent } from '../../utils/iconRegistry';
import apiService from '../../services/api';
import { useToast } from '../ui/ToastProvider';
import EntryModal from './EntryModal';
import SliderValueBar from '../groups/SliderValueBar';
import type { Entry, Group } from '../../types';

const stripMd = (s = '') => s
  .replace(/`{1,3}[^`]*`{1,3}/g, ' ')
  .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
  .replace(/\[(.*?)\]\([^)]*\)/g, '$1')
  .replace(/^#{1,6}\s+/gm, '')
  .replace(/^[>\-+*]\s+/gm, '')
  .replace(/[*_~`>#[\]()]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const splitTitleBody = (content = ''): { title: string; body: string } => {
  const text = (content || '').replace(/\r\n/g, '\n').trim();
  if (!text) return { title: '', body: '' };
  const lines = text.split('\n');
  const first = (lines[0] || '').trim();
  const heading = first.match(/^#{1,6}\s+(.+?)\s*$/);
  if (heading) return { title: heading[1].trim(), body: lines.slice(1).join('\n').trim() };
  if (lines.length > 1) return { title: first, body: lines.slice(1).join('\n').trim() };
  const idx = first.indexOf(' ');
  if (idx > 0) return { title: first.slice(0, idx).trim(), body: first.slice(idx + 1).trim() };
  return { title: first, body: '' };
};

interface HistoryEntryProps {
  entry: Entry;
  onDelete: (id: number) => void;
  onEdit?: (entry: Entry) => void;
  groups?: Group[];
}

const HistoryEntry = ({ entry, onDelete, onEdit, groups = [] }: HistoryEntryProps) => {
  const { getMoodIconComponent } = usePreferences();
  const MoodIconComponent = getMoodIconComponent(entry.mood);
  const { color } = getMoodIcon(entry.mood);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [open, setOpen] = useState(false);
  const modalHistoryPushed = useRef(false);

  const { title: rawTitle, body: rawBody } = splitTitleBody(entry.content || '');
  const title = stripMd(rawTitle).slice(0, 80);
  const excerpt = stripMd(rawBody).slice(0, 420);

  const { show } = useToast();

  const handleDelete = async (): Promise<boolean> => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return false;
    setIsDeleting(true);
    try {
      await apiService.deleteMoodEntry(entry.id);
      onDelete(entry.id);
      show('Entry deleted', 'success');
      return true;
    } catch (error) {
      console.error('Failed to delete entry:', error);
      show('Failed to delete entry. Please try again.', 'error');
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  const openPreview = () => {
    if (open) return;
    const currentState = typeof window.history.state === 'object' && window.history.state !== null
      ? window.history.state
      : {};
    window.history.pushState({ ...currentState, waymarkEntryModal: entry.id }, '', window.location.href);
    modalHistoryPushed.current = true;
    setOpen(true);
  };

  const closePreview = () => {
    if (modalHistoryPushed.current && window.history.state?.waymarkEntryModal === entry.id) {
      modalHistoryPushed.current = false;
      setOpen(false);
      window.history.back();
      return;
    }
    modalHistoryPushed.current = false;
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onPopState = () => {
      modalHistoryPushed.current = false;
      setOpen(false);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [open]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPreview(); }
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`entry-card${entry.is_important ? ' is-important' : ''}`}
      role="button"
      tabIndex={0}
      onClick={openPreview}
      onKeyDown={onKey}
      aria-label={`Open entry from ${entry.date}`}
      style={{
        border: entry.is_important
          ? undefined
          : isHovered ? '1px solid color-mix(in oklab, var(--accent-600), transparent 55%)' : '1px solid var(--border)',
        boxShadow: entry.is_important ? undefined : (isHovered ? 'var(--shadow-md)' : 'var(--shadow-sm)'),
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <span style={{ color, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-bg-softer)', border: '1px solid var(--border)' }}>
          <MoodIconComponent size={18} strokeWidth={1.8} />
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, color: 'var(--text)' }}>{entry.date}</span>
          {entry.created_at && (
            <>
              <span aria-hidden="true" style={{ color: 'color-mix(in oklab, var(--text), transparent 40%)' }}>•</span>
              <span style={{ color: 'color-mix(in oklab, var(--text), transparent 20%)' }}>
                {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
              </span>
            </>
          )}
        </div>
        {entry.is_important && (
          <span
            className="important-badge"
            title={entry.important_reason || 'Important day'}
            style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            <Star size={14} strokeWidth={1.75} />
            {entry.important_reason || 'Important'}
          </span>
        )}
      </div>

      <div className="entry-card__title">{title || 'Entry'}</div>
      {excerpt && <div className="entry-card__excerpt">{excerpt}</div>}

      {entry.slider_values && entry.slider_values.length > 0 && (
        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {entry.slider_values.map(sliderValue => (
            <SliderValueBar key={sliderValue.id} sliderValue={sliderValue} />
          ))}
        </div>
      )}

      {entry.selections && entry.selections.length > 0 && (
        <div style={{ marginTop: '0.75rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {entry.selections.map(selection => {
              const IconComp = selection.icon ? getIconComponent(selection.icon) : null;
              const bg = selection.group_color ? selection.group_color + '18' : undefined;
              const border = selection.group_color ? selection.group_color + '50' : undefined;
              return (
                <span
                  key={selection.id}
                  className="tag"
                  style={bg ? { backgroundColor: bg, borderColor: border, borderWidth: 1, borderStyle: 'solid' } : {}}
                >
                  {IconComp && <IconComp size={14} strokeWidth={1.75} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px', ...(selection.group_color ? { color: selection.group_color } : {}) }} />}
                  {selection.name}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <EntryModal
        isOpen={open}
        entry={entry}
        onClose={closePreview}
        onDelete={async () => {
          const ok = await handleDelete();
          if (ok) closePreview();
        }}
        isDeleting={isDeleting}
        onEdit={onEdit ? () => { closePreview(); onEdit(entry); } : undefined}
        groups={groups}
      />
    </div>
  );
};

export default HistoryEntry;
