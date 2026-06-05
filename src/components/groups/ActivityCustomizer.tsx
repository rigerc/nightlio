import { useState } from 'react';
import type { CSSProperties, DragEvent } from 'react';
import { ChevronUp, GripVertical, Palette, Plus, Trash2 } from 'lucide-react';
import { useGroups } from '../../hooks/useGroups';
import { getIconComponent } from '../../utils/iconRegistry';
import IconPicker from '../ui/IconPicker';
import ColorPicker from '../ui/ColorPicker';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import type { Group, GroupOption } from '../../types';

const inputClass =
  'px-2.5 py-1.5 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] outline-none focus:border-[var(--accent-600)] focus:ring-1 focus:ring-[var(--accent-600)]/20 transition-colors';

const reorderIds = (ids: number[], draggedId: number, targetId: number) => {
  if (draggedId === targetId) return ids;
  const next = ids.filter(id => id !== draggedId);
  const targetIndex = next.indexOf(targetId);
  if (targetIndex === -1) return ids;
  next.splice(targetIndex, 0, draggedId);
  return next;
};

interface EditableNameProps {
  value: string;
  onSave: (value: string) => void;
  className?: string;
  style?: CSSProperties;
}

const EditableName = ({ value, onSave, className = '', style }: EditableNameProps) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
    else setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value); setEditing(false); } }}
        className={cn(inputClass, 'min-w-0 flex-1', className)}
        style={style}
      />
    );
  }
  return (
    <span
      onClick={() => { setDraft(value); setEditing(true); }}
      className={cn('cursor-text hover:underline decoration-dashed underline-offset-2 font-medium text-[var(--text)]', className)}
      style={style}
      title="Click to edit"
    >
      {value}
    </span>
  );
};

interface ActivityChipProps {
  option: GroupOption;
  isDragging: boolean;
  onUpdate: (id: number, updates: Partial<GroupOption>) => void;
  onDelete: (id: number) => void;
  onDragStart: (id: number) => void;
  onDropOn: (id: number) => void;
}

const ActivityChip = ({ option, isDragging, onUpdate, onDelete, onDragStart, onDropOn }: ActivityChipProps) => {
  const [showIconPicker, setShowIconPicker] = useState(false);
  const IconComp = option.icon ? getIconComponent(option.icon) : null;

  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(option.id));
    onDragStart(option.id);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragOver={event => { event.preventDefault(); event.stopPropagation(); }}
      onDrop={event => { event.preventDefault(); event.stopPropagation(); onDropOn(option.id); }}
      className={cn(
        'group/activity relative inline-flex min-w-[180px] max-w-full flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-sm transition-all hover:-translate-y-px hover:border-[color-mix(in_oklab,var(--accent-600),transparent_55%)] hover:bg-[var(--bg)]',
        isDragging && 'opacity-45 ring-2 ring-[var(--accent-600)]'
      )}
    >
      <div className="flex items-center gap-1.5">
        <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-[var(--text-muted)] active:cursor-grabbing" aria-hidden="true" />
        <button
          type="button"
          onClick={() => setShowIconPicker(p => !p)}
          title={option.icon ? `Icon: ${option.icon}` : 'Add icon'}
          className={cn('shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border border-[var(--border)] transition-colors', showIconPicker ? 'bg-[var(--bg)] text-[var(--text)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]')}
        >
          {IconComp ? <IconComp className="w-6 h-6" strokeWidth={1.75} /> : <Plus className="w-5 h-5" />}
        </button>
        <EditableName value={option.name} onSave={name => onUpdate(option.id, { name })} className="min-w-0 flex-1 truncate text-sm" />
        <button
          type="button"
          onClick={() => { if (window.confirm(`Delete activity "${option.name}"? Existing entries that reference it will lose this tag.`)) onDelete(option.id); }}
          className="shrink-0 rounded-lg p-1 text-[var(--text-muted)] opacity-70 transition-all hover:bg-red-500/10 hover:text-red-500 group-hover/activity:opacity-100"
          aria-label={`Delete ${option.name}`}
        >
          <Trash2 size={14} />
        </button>
      </div>
      {showIconPicker && (
        <div className="mt-2" onDragStart={event => event.stopPropagation()}>
          <IconPicker value={option.icon ?? null} onChange={iconName => { onUpdate(option.id, { icon: iconName ?? undefined }); setShowIconPicker(false); }} />
        </div>
      )}
    </div>
  );
};

interface GroupCardProps {
  group: Group;
  isDragging: boolean;
  onUpdate: (id: number, updates: Partial<Group>) => void;
  onDelete: (id: number) => void;
  onDragStart: (id: number) => void;
  onDropOn: (id: number) => void;
  onUpdateOption: (id: number, updates: Partial<GroupOption>) => void;
  onDeleteOption: (id: number) => void;
  onReorderOptions: (groupId: number, ids: number[]) => void;
  onAddOption: (groupId: number, name: string) => Promise<boolean>;
}

const GroupCard = ({ group, isDragging, onUpdate, onDelete, onDragStart, onDropOn, onUpdateOption, onDeleteOption, onReorderOptions, onAddOption }: GroupCardProps) => {
  const [expanded, setExpanded] = useState(true);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [addingOption, setAddingOption] = useState(false);
  const [newOptionName, setNewOptionName] = useState('');
  const [savingOption, setSavingOption] = useState(false);
  const [draggingOptionId, setDraggingOptionId] = useState<number | null>(null);

  const GroupIconComp = group.icon ? getIconComponent(group.icon) : null;
  const accentColor = group.color ?? null;

  const handleAddOption = async () => {
    if (!newOptionName.trim()) return;
    setSavingOption(true);
    const ok = await onAddOption(group.id, newOptionName.trim());
    if (ok) { setNewOptionName(''); setAddingOption(false); }
    setSavingOption(false);
  };

  const handleGroupDragStart = (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(group.id));
    onDragStart(group.id);
  };

  const dropOption = (targetId: number) => {
    if (!draggingOptionId) return;
    const nextIds = reorderIds(group.options.map(option => option.id), draggingOptionId, targetId);
    onReorderOptions(group.id, nextIds);
    setDraggingOptionId(null);
  };

  return (
    <div
      draggable
      onDragStart={handleGroupDragStart}
      onDragOver={event => event.preventDefault()}
      onDrop={event => { event.preventDefault(); onDropOn(group.id); }}
      onDragEnd={() => onDropOn(group.id)}
      className={cn(
        'rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm transition-all',
        isDragging && 'opacity-50 ring-2 ring-[var(--accent-600)]'
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <GripVertical className="h-5 w-5 shrink-0 cursor-grab text-[var(--text-muted)] active:cursor-grabbing" aria-hidden="true" />
        <button
          type="button"
          onClick={() => { setShowIconPicker(p => !p); setShowColorPicker(false); }}
          title={group.icon ? `Icon: ${group.icon}` : 'Set group icon'}
          className={cn('mr-0.5 shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border border-[var(--border)] transition-colors', showIconPicker ? 'bg-[var(--bg)]' : 'hover:bg-[var(--bg)]')}
        >
          {GroupIconComp ? <GroupIconComp className="w-6 h-6 text-[var(--text-muted)]" strokeWidth={1.75} /> : <Plus className="w-5 h-5 text-[var(--text-muted)]" />}
        </button>
        <EditableName value={group.name} onSave={name => onUpdate(group.id, { name })} className="min-w-[8rem] flex-1 text-base" style={accentColor ? { color: accentColor } : undefined} />
        <button
          type="button"
          onClick={() => { setShowColorPicker(p => !p); setShowIconPicker(false); }}
          title="Set group color"
          className={cn('inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--text)] transition-all hover:bg-[var(--bg)]', showColorPicker && 'ring-2 ring-[var(--accent-600)] ring-offset-1')}
        >
          <span className="h-4 w-4 rounded-full border border-[var(--border)]" style={{ backgroundColor: accentColor ?? 'var(--border-soft)' }} />
          <Palette size={14} />
          <span className="max-sm:hidden">Color</span>
        </button>
        <button
          type="button"
          onClick={() => setExpanded(p => !p)}
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--bg)] hover:text-[var(--text)]"
        >
          <span>{group.options.length} {group.options.length === 1 ? 'activity' : 'activities'}</span>
          <ChevronUp size={14} className={cn('transition-transform', !expanded && 'rotate-180')} />
        </button>
        <button
          type="button"
          onClick={() => { if (window.confirm(`Delete category "${group.name}" and all its activities? This cannot be undone.`)) onDelete(group.id); }}
          className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-500"
          aria-label={`Delete ${group.name}`}
        >
          <Trash2 size={16} />
        </button>
      </div>

      {showColorPicker && (
        <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3" onDragStart={event => event.stopPropagation()}>
          <p className="m-0 mb-2 text-xs font-medium text-[var(--text-muted)]">Group color</p>
          <ColorPicker value={accentColor} nullable onChange={color => { onUpdate(group.id, { color: color ?? undefined }); }} />
        </div>
      )}

      {showIconPicker && (
        <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3" onDragStart={event => event.stopPropagation()}>
          <p className="m-0 mb-2 text-xs font-medium text-[var(--text-muted)]">Group icon</p>
          <IconPicker value={group.icon ?? null} onChange={iconName => { onUpdate(group.id, { icon: iconName ?? undefined }); setShowIconPicker(false); }} />
        </div>
      )}

      {expanded && (
        <div className="mt-3 border-t border-[var(--border)] pt-3">
          {group.options.length === 0 && <p className="m-0 mb-2 text-xs italic text-[var(--text-muted)]">No activities yet.</p>}
          <div className="flex flex-wrap gap-2">
            {group.options.map(opt => (
              <ActivityChip
                key={opt.id}
                option={opt}
                isDragging={draggingOptionId === opt.id}
                onUpdate={onUpdateOption}
                onDelete={onDeleteOption}
                onDragStart={setDraggingOptionId}
                onDropOn={dropOption}
              />
            ))}
          </div>
          {addingOption ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                autoFocus
                type="text"
                placeholder="Activity name…"
                value={newOptionName}
                onChange={e => setNewOptionName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void handleAddOption(); if (e.key === 'Escape') { setAddingOption(false); setNewOptionName(''); } }}
                className={cn(inputClass, 'min-w-[220px] flex-1 text-sm')}
              />
              <Button variant="default" onClick={() => void handleAddOption()} disabled={!newOptionName.trim() || savingOption} className="text-xs py-1 px-3 h-auto">
                {savingOption ? 'Adding…' : 'Add'}
              </Button>
              <button type="button" onClick={() => { setAddingOption(false); setNewOptionName(''); }} className="text-[var(--text-muted)] hover:text-[var(--text)] text-xs">Cancel</button>
            </div>
          ) : (
            <button type="button" onClick={() => setAddingOption(true)} className="mt-3 inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-muted)] transition-colors hover:border-[var(--accent-600)] hover:text-[var(--accent-600)]">
              <Plus size={13} />Add activity
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const ActivityCustomizer = () => {
  const { groups, loading, createGroup, createGroupOption, updateGroup, updateGroupOption, deleteGroup, deleteGroupOption, reorderGroups, reorderGroupOptions } = useGroups();
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [savingGroup, setSavingGroup] = useState(false);
  const [draggingGroupId, setDraggingGroupId] = useState<number | null>(null);

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return;
    setSavingGroup(true);
    const ok = await createGroup(newGroupName.trim());
    if (ok) { setNewGroupName(''); setAddingGroup(false); }
    setSavingGroup(false);
  };

  const dropGroup = (targetId: number) => {
    if (!draggingGroupId) return;
    const nextIds = reorderIds(groups.map(group => group.id), draggingGroupId, targetId);
    reorderGroups(nextIds);
    setDraggingGroupId(null);
  };

  if (loading && groups.length === 0) return <p className="text-sm text-[var(--text-muted)] mt-3">Loading categories…</p>;

  return (
    <div className="mt-3">
      <div className="flex flex-col gap-3">
        {groups.map(group => (
          <GroupCard
            key={group.id}
            group={group}
            isDragging={draggingGroupId === group.id}
            onUpdate={updateGroup}
            onDelete={deleteGroup}
            onDragStart={setDraggingGroupId}
            onDropOn={dropGroup}
            onUpdateOption={updateGroupOption}
            onDeleteOption={deleteGroupOption}
            onReorderOptions={reorderGroupOptions}
            onAddOption={createGroupOption}
          />
        ))}
      </div>

      {addingGroup ? (
        <div className="flex flex-wrap gap-2 mt-3">
          <input
            autoFocus
            type="text"
            placeholder="Category name (e.g., Weather, Social)…"
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void handleAddGroup(); if (e.key === 'Escape') { setAddingGroup(false); setNewGroupName(''); } }}
            className={cn(inputClass, 'min-w-[240px] flex-1')}
          />
          <Button variant="default" onClick={() => void handleAddGroup()} disabled={!newGroupName.trim() || savingGroup} className="shrink-0">
            {savingGroup ? 'Creating…' : 'Create'}
          </Button>
          <button type="button" onClick={() => { setAddingGroup(false); setNewGroupName(''); }} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">Cancel</button>
        </div>
      ) : (
        <Button variant="default" onClick={() => setAddingGroup(true)} className="mt-3 gap-2 rounded-full">
          <Plus size={15} />Add Category
        </Button>
      )}
    </div>
  );
};

export default ActivityCustomizer;
