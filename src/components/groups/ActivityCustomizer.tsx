import { useState } from 'react';
import type { CSSProperties } from 'react';
import { ChevronDown, ChevronRight, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { useGroups } from '../../hooks/useGroups';
import { getIconComponent } from '../../utils/iconRegistry';
import IconPicker from '../ui/IconPicker';
import ColorPicker from '../ui/ColorPicker';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import type { Group, GroupOption } from '../../types';

const inputClass =
  'px-2.5 py-1.5 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] outline-none focus:border-[var(--accent-600)] focus:ring-1 focus:ring-[var(--accent-600)]/20 transition-colors';

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

interface OptionRowProps {
  option: GroupOption;
  groupId: number;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (id: number, updates: Partial<GroupOption>) => void;
  onDelete: (id: number) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const OptionRow = ({ option, isFirst, isLast, onUpdate, onDelete, onMoveUp, onMoveDown }: OptionRowProps) => {
  const [showIconPicker, setShowIconPicker] = useState(false);
  const IconComp = option.icon ? getIconComponent(option.icon) : null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-[var(--bg)] group">
        <div className="flex flex-col gap-0.5 shrink-0">
          <button onClick={onMoveUp} disabled={isFirst} className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"><ChevronUp size={12} /></button>
          <button onClick={onMoveDown} disabled={isLast} className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"><ChevronDown size={12} /></button>
        </div>
        <button
          onClick={() => setShowIconPicker(p => !p)}
          title={option.icon ? `Icon: ${option.icon}` : 'Add icon'}
          className={cn('shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center border border-[var(--border)] transition-colors', showIconPicker ? 'bg-[var(--bg)] text-[var(--text)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]')}
        >
          {IconComp ? <IconComp className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={1.75} /> : <Plus className="w-5 h-5 sm:w-6 sm:h-6" />}
        </button>
        <EditableName value={option.name} onSave={name => onUpdate(option.id, { name })} className="flex-1 text-sm" />
        <button
          onClick={() => { if (window.confirm(`Delete activity "${option.name}"? Existing entries that reference it will lose this tag.`)) onDelete(option.id); }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--text-muted)] hover:text-red-500 transition-all"
        >
          <Trash2 size={13} />
        </button>
      </div>
      {showIconPicker && (
        <div className="ml-10 mb-1">
          <IconPicker value={option.icon ?? null} onChange={iconName => { onUpdate(option.id, { icon: iconName ?? undefined }); setShowIconPicker(false); }} />
        </div>
      )}
    </div>
  );
};

interface GroupCardProps {
  group: Group;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (id: number, updates: Partial<Group>) => void;
  onDelete: (id: number) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onUpdateOption: (id: number, updates: Partial<GroupOption>) => void;
  onDeleteOption: (id: number) => void;
  onReorderOptions: (groupId: number, ids: number[]) => void;
  onAddOption: (groupId: number, name: string) => Promise<boolean>;
}

const GroupCard = ({ group, isFirst, isLast, onUpdate, onDelete, onMoveUp, onMoveDown, onUpdateOption, onDeleteOption, onReorderOptions, onAddOption }: GroupCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [addingOption, setAddingOption] = useState(false);
  const [newOptionName, setNewOptionName] = useState('');
  const [savingOption, setSavingOption] = useState(false);

  const GroupIconComp = group.icon ? getIconComponent(group.icon) : null;
  const accentColor = group.color ?? null;

  const handleAddOption = async () => {
    if (!newOptionName.trim()) return;
    setSavingOption(true);
    const ok = await onAddOption(group.id, newOptionName.trim());
    if (ok) { setNewOptionName(''); setAddingOption(false); }
    setSavingOption(false);
  };

  const moveOption = (index: number, direction: number) => {
    const ids = group.options.map(o => o.id);
    const newIds = [...ids];
    const target = index + direction;
    if (target < 0 || target >= newIds.length) return;
    [newIds[index], newIds[target]] = [newIds[target], newIds[index]];
    onReorderOptions(group.id, newIds);
  };

  return (
    <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--surface)] shadow-sm">
      <div className="flex items-center gap-2 p-3">
        <div className="flex flex-col gap-0.5 shrink-0">
          <button onClick={onMoveUp} disabled={isFirst} className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"><ChevronUp size={14} /></button>
          <button onClick={onMoveDown} disabled={isLast} className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"><ChevronDown size={14} /></button>
        </div>
        <button
          onClick={() => { setShowIconPicker(p => !p); setShowColorPicker(false); }}
          title={group.icon ? `Icon: ${group.icon}` : 'Set group icon'}
          className={cn('shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center border-2 border-[var(--border)] transition-colors', showIconPicker ? 'bg-[var(--bg)]' : 'hover:bg-[var(--bg)]')}
        >
          {GroupIconComp ? <GroupIconComp className="w-7 h-7 sm:w-8 sm:h-8 text-[var(--text-muted)]" strokeWidth={1.75} /> : <Plus className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--text-muted)]" />}
        </button>
        <EditableName value={group.name} onSave={name => onUpdate(group.id, { name })} className="flex-1 text-base" style={accentColor ? { color: accentColor } : undefined} />
        <button
          onClick={() => { setShowColorPicker(p => !p); setShowIconPicker(false); }}
          title="Set group color"
          className={cn('shrink-0 w-6 h-6 rounded-full border-2 transition-all', showColorPicker ? 'border-[var(--text)] scale-110' : 'border-[var(--border)] hover:scale-105')}
          style={{ backgroundColor: accentColor ?? 'var(--border)' }}
        />
        <button onClick={() => setExpanded(p => !p)} className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors shrink-0">
          <span>{group.options.length} {group.options.length === 1 ? 'activity' : 'activities'}</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronRight size={14} />}
        </button>
        <button
          onClick={() => { if (window.confirm(`Delete category "${group.name}" and all its activities? This cannot be undone.`)) onDelete(group.id); }}
          className="p-1 rounded text-[var(--text-muted)] hover:text-red-500 transition-colors shrink-0"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {showColorPicker && (
        <div className="px-3 pb-3 border-t border-[var(--border)] pt-2">
          <p className="text-xs text-[var(--text-muted)] mb-2">Badge color</p>
          <ColorPicker value={accentColor} nullable onChange={color => { onUpdate(group.id, { color: color ?? undefined }); }} />
        </div>
      )}

      {showIconPicker && (
        <div className="px-3 pb-3 border-t border-[var(--border)] pt-2">
          <p className="text-xs text-[var(--text-muted)] mb-2">Group icon</p>
          <IconPicker value={group.icon ?? null} onChange={iconName => { onUpdate(group.id, { icon: iconName ?? undefined }); setShowIconPicker(false); }} />
        </div>
      )}

      {expanded && (
        <div className="border-t border-[var(--border)] p-3 bg-[var(--bg)]">
          {group.options.length === 0 && <p className="text-xs text-[var(--text-muted)] italic mb-2">No activities yet.</p>}
          {group.options.map((opt, idx) => (
            <OptionRow
              key={opt.id}
              option={opt}
              groupId={group.id}
              isFirst={idx === 0}
              isLast={idx === group.options.length - 1}
              onUpdate={onUpdateOption}
              onDelete={onDeleteOption}
              onMoveUp={() => moveOption(idx, -1)}
              onMoveDown={() => moveOption(idx, 1)}
            />
          ))}
          {addingOption ? (
            <div className="flex gap-2 mt-2">
              <input
                autoFocus
                type="text"
                placeholder="Activity name…"
                value={newOptionName}
                onChange={e => setNewOptionName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void handleAddOption(); if (e.key === 'Escape') { setAddingOption(false); setNewOptionName(''); } }}
                className={cn(inputClass, 'flex-1 text-sm')}
              />
              <Button variant="default" onClick={() => void handleAddOption()} disabled={!newOptionName.trim() || savingOption} className="text-xs py-1 px-3 h-auto">
                {savingOption ? 'Adding…' : 'Add'}
              </Button>
              <button onClick={() => { setAddingOption(false); setNewOptionName(''); }} className="text-[var(--text-muted)] hover:text-[var(--text)] text-xs">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setAddingOption(true)} className="mt-2 flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--accent-600)] transition-colors">
              <Plus size={12} />Add activity
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

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return;
    setSavingGroup(true);
    const ok = await createGroup(newGroupName.trim());
    if (ok) { setNewGroupName(''); setAddingGroup(false); }
    setSavingGroup(false);
  };

  const moveGroup = (index: number, direction: number) => {
    const ids = groups.map(g => g.id);
    const newIds = [...ids];
    const target = index + direction;
    if (target < 0 || target >= newIds.length) return;
    [newIds[index], newIds[target]] = [newIds[target], newIds[index]];
    reorderGroups(newIds);
  };

  if (loading && groups.length === 0) return <p className="text-sm text-[var(--text-muted)] mt-3">Loading categories…</p>;

  return (
    <div className="mt-3">
      <div className="flex flex-col gap-3">
        {groups.map((group, idx) => (
          <GroupCard
            key={group.id}
            group={group}
            isFirst={idx === 0}
            isLast={idx === groups.length - 1}
            onUpdate={updateGroup}
            onDelete={deleteGroup}
            onMoveUp={() => moveGroup(idx, -1)}
            onMoveDown={() => moveGroup(idx, 1)}
            onUpdateOption={updateGroupOption}
            onDeleteOption={deleteGroupOption}
            onReorderOptions={reorderGroupOptions}
            onAddOption={createGroupOption}
          />
        ))}
      </div>

      {addingGroup ? (
        <div className="flex gap-2 mt-3">
          <input
            autoFocus
            type="text"
            placeholder="Category name (e.g., Weather, Social)…"
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void handleAddGroup(); if (e.key === 'Escape') { setAddingGroup(false); setNewGroupName(''); } }}
            className={cn(inputClass, 'flex-1')}
          />
          <Button variant="default" onClick={() => void handleAddGroup()} disabled={!newGroupName.trim() || savingGroup} className="shrink-0">
            {savingGroup ? 'Creating…' : 'Create'}
          </Button>
          <button onClick={() => { setAddingGroup(false); setNewGroupName(''); }} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">Cancel</button>
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
