import ReactMarkdown from 'react-markdown';
import { useEffect } from 'react';
import { Pencil, Trash2, FileDown } from 'lucide-react';
import { exportEntryToMarkdown } from '../../utils/exportUtils';
import { getIconComponent } from '../../utils/iconRegistry';
import { FITNESS_LABEL, formatFitnessValue } from '../../utils/fitnessUtils';
import type { Entry, Group } from '../../types';

const backdropStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
};

const panelStyle: React.CSSProperties = {
  width: 'min(820px, 92vw)', maxHeight: '85vh', overflow: 'auto',
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: '14px', boxShadow: 'var(--shadow-lg)', padding: '20px',
};

const deriveTitleBody = (content = ''): { title: string; body: string } => {
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

interface EntryModalProps {
  isOpen: boolean;
  entry: Entry | null;
  onClose: () => void;
  onDelete?: () => Promise<void>;
  isDeleting?: boolean;
  onEdit?: () => void;
  groups?: Group[];
}

const EntryModal = ({ isOpen, entry, onClose, onDelete, isDeleting = false, onEdit, groups = [] }: EntryModalProps) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !entry) return null;

  const onBackdrop = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.target === e.currentTarget) onClose();
  };

  const handleExportMarkdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    exportEntryToMarkdown(entry, groups);
  };

  const { title, body } = deriveTitleBody(entry.content);

  return (
    <div style={backdropStyle} onClick={onBackdrop} role="dialog" aria-modal="true" aria-labelledby="entry-modal-title">
      <div style={panelStyle} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div id="entry-modal-title" style={{ fontWeight: 600, color: 'var(--text)' }}>{entry.date}</div>
            {entry.created_at && (
              <div style={{ fontSize: '0.85rem', color: 'color-mix(in oklab, var(--text), transparent 30%)' }}>
                {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleExportMarkdown}
              style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, boxShadow: 'var(--shadow-sm)', cursor: 'pointer' }}
              title="Export as Markdown" aria-label="Export as Markdown"
            >
              <FileDown size={18} />
            </button>
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                disabled={isDeleting}
                style={{ background: 'var(--accent-bg)', color: '#fff', border: '1px solid var(--accent-bg)', borderRadius: 10, padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, boxShadow: 'var(--shadow-sm)' }}
                title="Edit entry" aria-label="Edit entry"
              >
                <Pencil size={18} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); void onDelete(); }}
                disabled={isDeleting}
                style={{ background: 'var(--danger)', color: '#fff', border: '1px solid var(--danger)', borderRadius: 10, padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, boxShadow: 'var(--shadow-sm)' }}
                title="Delete entry" aria-label="Delete entry"
              >
                {isDeleting ? <Trash2 size={18} opacity={0.5} /> : <Trash2 size={18} />}
              </button>
            )}
          </div>
        </div>
        {title && (
          <div className="history-markdown" style={{ marginBottom: 8 }}>
            <h1 style={{ margin: 0 }}>{title}</h1>
          </div>
        )}
        {entry.selections && entry.selections.length > 0 && (
          <div className="tag-list" style={{ marginBottom: 12 }}>
            {entry.selections.map((s) => {
              const IconComp = s.icon ? getIconComponent(s.icon) : null;
              const bg = s.group_color ? s.group_color + '18' : undefined;
              const border = s.group_color ? s.group_color + '50' : undefined;
              return (
                <span
                  key={s.id}
                  className="tag"
                  style={bg ? { backgroundColor: bg, borderColor: border, borderWidth: 1, borderStyle: 'solid' } : {}}
                >
                  {IconComp && <IconComp size={15} strokeWidth={1.75} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />}
                  {s.name}
                </span>
              );
            })}
          </div>
        )}
        {entry.fitness && entry.fitness.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {entry.fitness.map((d) => (
              <span
                key={`${d.data_type}-${d.id}`}
                style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: 12,
                  fontSize: '0.82rem',
                  background: 'color-mix(in oklab, var(--accent-bg), transparent 85%)',
                  border: '1px solid color-mix(in oklab, var(--accent-bg), transparent 60%)',
                  color: 'var(--text)',
                }}
              >
                <span style={{ color: 'var(--text-muted)', marginRight: 4 }}>
                  {FITNESS_LABEL[d.data_type] ?? d.data_type}:
                </span>
                {formatFitnessValue(d)}
              </span>
            ))}
          </div>
        )}
        <div className="history-markdown">
          <ReactMarkdown>{body}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default EntryModal;
