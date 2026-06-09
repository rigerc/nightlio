import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { ArrowLeft, GripVertical, Palette, Plus, SlidersHorizontal, Tag, Trash2 } from 'lucide-react';
import { useGroups } from '../../hooks/useGroups';
import { getIconComponent } from '../../utils/iconRegistry';
import IconPicker from '../ui/IconPicker';
import ColorPicker from '../ui/ColorPicker';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import type { Group, GroupOption, GroupType } from '../../types';

const inputClass =
  'px-2.5 py-1.5 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] outline-none focus:border-[var(--accent-600)] focus:ring-1 focus:ring-[var(--accent-600)]/20 transition-colors';

const reorderIds = (ids: number[], draggedId: number, targetId: number) => {
  if (draggedId === targetId) return ids;
  const next = ids.filter(id => id !== draggedId);
  const idx = next.indexOf(targetId);
  if (idx === -1) return ids;
  next.splice(idx, 0, draggedId);
  return next;
};

interface EditableNameProps {
  value: string;
  onSave: (v: string) => void;
  className?: string;
  style?: CSSProperties;
}

const EditableName = ({ value, onSave, className = '', style }: EditableNameProps) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    const t = draft.trim();
    if (t && t !== value) onSave(t);
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
        onKeyDown={e => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setDraft(value); setEditing(false); }
        }}
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

// ─── Activity tag (compact pill) ────────────────────────────────────────────

interface ActivityTagProps {
  option: GroupOption;
  isDragging: boolean;
  onUpdate: (id: number, u: Partial<GroupOption>) => void;
  onDelete: (id: number) => void;
  onDragStart: (id: number) => void;
  onDropOn: (id: number) => void;
}

const ActivityTag = ({ option, isDragging, onUpdate, onDelete, onDragStart, onDropOn }: ActivityTagProps) => {
  const [showIconPicker, setShowIconPicker] = useState(false);
  const IconComp = option.icon ? getIconComponent(option.icon) : null;

  return (
    <div
      draggable
      onDragStart={e => { e.stopPropagation(); e.dataTransfer.effectAllowed = 'move'; onDragStart(option.id); }}
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={e => { e.preventDefault(); e.stopPropagation(); onDropOn(option.id); }}
      className={cn('group/tag flex flex-col', isDragging && 'opacity-40')}
    >
      <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm transition-colors hover:border-[var(--accent-600)]/50 hover:bg-[var(--bg)]">
        <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-[var(--text-muted)] opacity-50 group-hover/tag:opacity-100 active:cursor-grabbing" />
        <button
          type="button"
          onClick={() => setShowIconPicker(p => !p)}
          className="shrink-0 rounded p-0.5 transition-colors hover:bg-[var(--bg)]"
          title={option.icon ?? 'Set icon'}
        >
          {IconComp
            ? <IconComp className="h-3.5 w-3.5 text-[var(--text-muted)]" strokeWidth={1.75} />
            : <Tag className="h-3 w-3 text-[var(--text-muted)] opacity-40" />}
        </button>
        <EditableName value={option.name} onSave={name => onUpdate(option.id, { name })} className="text-sm" />
        <button
          type="button"
          onClick={() => { if (window.confirm(`Delete "${option.name}"?`)) onDelete(option.id); }}
          className="ml-0.5 shrink-0 rounded p-0.5 text-[var(--text-muted)] transition-all hover:text-red-500 opacity-100 md:opacity-0 md:group-hover/tag:opacity-100"
          aria-label={`Delete ${option.name}`}
        >
          <Trash2 size={11} />
        </button>
      </div>
      {showIconPicker && (
        <div className="relative z-10 mt-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-2 shadow-lg" onDragStart={e => e.stopPropagation()}>
          <IconPicker
            value={option.icon ?? null}
            onChange={name => { onUpdate(option.id, { icon: name ?? undefined }); setShowIconPicker(false); }}
          />
        </div>
      )}
    </div>
  );
};

// ─── Slider config ───────────────────────────────────────────────────────────

const SliderConfig = ({ group, onUpdate }: { group: Group; onUpdate: (id: number, u: Partial<Group>) => void }) => {
  const min = group.slider_min ?? 1;
  const max = group.slider_max ?? 5;
  const labels = Array.from({ length: max - min + 1 }, (_, i) => group.slider_labels?.[i] ?? '');
  const [minDraft, setMinDraft] = useState(String(min));
  const [maxDraft, setMaxDraft] = useState(String(max));

  const commitRange = () => {
    const nMin = parseInt(minDraft, 10);
    const nMax = parseInt(maxDraft, 10);
    if (!Number.isFinite(nMin) || !Number.isFinite(nMax) || nMin >= nMax) {
      setMinDraft(String(min)); setMaxDraft(String(max)); return;
    }
    const nLabels = Array.from({ length: nMax - nMin + 1 }, (_, i) => labels[i] ?? '');
    onUpdate(group.id, { slider_min: nMin, slider_max: nMax, slider_labels: nLabels });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-[var(--text-muted)]">Min</label>
          <input
            type="number" value={minDraft}
            onChange={e => setMinDraft(e.target.value)}
            onBlur={commitRange}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            className={cn(inputClass, 'w-20')}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-[var(--text-muted)]">Max</label>
          <input
            type="number" value={maxDraft}
            onChange={e => setMaxDraft(e.target.value)}
            onBlur={commitRange}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            className={cn(inputClass, 'w-20')}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Step labels</p>
        {labels.map((label, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-5 shrink-0 text-right text-xs font-mono text-[var(--text-muted)]">{min + i}</span>
            <input
              type="text"
              placeholder={`Label for ${min + i}…`}
              value={label}
              onChange={e => {
                const next = [...labels];
                next[i] = e.target.value;
                onUpdate(group.id, { slider_labels: next });
              }}
              className={cn(inputClass, 'flex-1')}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Group list row (left panel) ─────────────────────────────────────────────

interface GroupListRowProps {
  group: Group;
  isSelected: boolean;
  isDragging: boolean;
  onSelect: () => void;
  onDragStart: (id: number) => void;
  onDropOn: (id: number) => void;
}

const GroupListRow = ({ group, isSelected, isDragging, onSelect, onDragStart, onDropOn }: GroupListRowProps) => {
  const IconComp = group.icon ? getIconComponent(group.icon) : null;
  const isSlider = group.type === 'slider';

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart(group.id); }}
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); onDropOn(group.id); }}
      onClick={onSelect}
      className={cn(
        'flex cursor-pointer select-none items-center gap-2 rounded-lg px-2 py-2 transition-all',
        isSelected
          ? 'border border-[var(--accent-600)]/30 bg-[var(--accent-bg-softer)]'
          : 'border border-transparent hover:bg-[var(--surface)]',
        isDragging && 'opacity-40',
      )}
    >
      <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-[var(--text-muted)] opacity-40 active:cursor-grabbing" />
      <span
        className="h-3 w-3 shrink-0 rounded-full border border-black/10"
        style={{ backgroundColor: group.color ?? 'var(--border-soft)' }}
      />
      {IconComp
        ? <IconComp className="h-5 w-5 shrink-0 text-[var(--text-muted)]" strokeWidth={1.75} />
        : <span className="h-5 w-5 shrink-0" />}
      <span
        className={cn('flex-1 truncate text-sm', isSelected ? 'font-semibold' : 'text-[var(--text)]')}
        style={group.color ? { color: group.color } : undefined}
      >
        {group.name}
      </span>
      {isSlider
        ? <SlidersHorizontal className="h-3 w-3 shrink-0 text-[var(--text-muted)]" />
        : <span className="shrink-0 text-xs tabular-nums text-[var(--text-muted)]">{group.options.length}</span>}
    </div>
  );
};

// ─── Group detail panel (right panel) ────────────────────────────────────────

interface GroupDetailProps {
  group: Group;
  onUpdate: (id: number, u: Partial<Group>) => void;
  onDelete: (id: number) => void;
  onUpdateOption: (id: number, u: Partial<GroupOption>) => void;
  onDeleteOption: (id: number) => void;
  onReorderOptions: (groupId: number, ids: number[]) => void;
  onAddOption: (groupId: number, name: string) => Promise<boolean>;
  onBack?: () => void;
}

const GroupDetail = ({ group, onUpdate, onDelete, onUpdateOption, onDeleteOption, onReorderOptions, onAddOption, onBack }: GroupDetailProps) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [addingOption, setAddingOption] = useState(false);
  const [newOptionName, setNewOptionName] = useState('');
  const [savingOption, setSavingOption] = useState(false);
  const [draggingOptionId, setDraggingOptionId] = useState<number | null>(null);
  const GroupIconComp = group.icon ? getIconComponent(group.icon) : null;

  const handleAddOption = async () => {
    if (!newOptionName.trim()) return;
    setSavingOption(true);
    const ok = await onAddOption(group.id, newOptionName.trim());
    if (ok) { setNewOptionName(''); setAddingOption(false); }
    setSavingOption(false);
  };

  const dropOption = (targetId: number) => {
    if (!draggingOptionId) return;
    onReorderOptions(group.id, reorderIds(group.options.map(o => o.id), draggingOptionId, targetId));
    setDraggingOptionId(null);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2.5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="md:hidden shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg)] hover:text-[var(--text)]"
            aria-label="Back to group list"
          >
            <ArrowLeft size={16} />
          </button>
        )}
        <button
          type="button"
          onClick={() => { setShowIconPicker(p => !p); setShowColorPicker(false); }}
          title={group.icon ?? 'Set icon'}
          className={cn(
            'shrink-0 flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] transition-colors',
            showIconPicker ? 'bg-[var(--bg)]' : 'hover:bg-[var(--bg)]',
          )}
        >
          {GroupIconComp
            ? <GroupIconComp className="h-7 w-7 text-[var(--text-muted)]" strokeWidth={1.75} />
            : <Tag className="h-5 w-5 text-[var(--text-muted)] opacity-50" />}
        </button>
        <EditableName
          value={group.name}
          onSave={name => onUpdate(group.id, { name })}
          className="flex-1 text-base"
          style={group.color ? { color: group.color } : undefined}
        />
        <button
          type="button"
          onClick={() => { setShowColorPicker(p => !p); setShowIconPicker(false); }}
          title="Group color"
          className={cn(
            'shrink-0 inline-flex h-9 items-center gap-2 rounded-full border border-[var(--border)] px-3 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--bg)]',
            showColorPicker && 'ring-2 ring-[var(--accent-600)] ring-offset-1',
          )}
        >
          <span
            className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/10"
            style={{ backgroundColor: group.color ?? 'var(--border-soft)' }}
          />
          <Palette size={13} />
          <span className="hidden sm:inline">Color</span>
        </button>
        <button
          type="button"
          onClick={() => { if (window.confirm(`Delete "${group.name}" and all its activities?`)) onDelete(group.id); }}
          className="shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-500"
          aria-label={`Delete ${group.name}`}
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* Inline pickers */}
      {showIconPicker && (
        <div className="border-b border-[var(--border)] bg-[var(--bg)] p-3" onDragStart={e => e.stopPropagation()}>
          <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">Group icon</p>
          <IconPicker
            value={group.icon ?? null}
            onChange={name => { onUpdate(group.id, { icon: name ?? undefined }); setShowIconPicker(false); }}
          />
        </div>
      )}
      {showColorPicker && (
        <div className="border-b border-[var(--border)] bg-[var(--bg)] p-3" onDragStart={e => e.stopPropagation()}>
          <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">Group color</p>
          <ColorPicker
            value={group.color ?? null}
            nullable
            onChange={color => { onUpdate(group.id, { color: color ?? undefined }); setShowColorPicker(false); }}
          />
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3">
        {group.type === 'slider' ? (
          <SliderConfig group={group} onUpdate={onUpdate} />
        ) : (
          <>
            {group.options.length === 0 && !addingOption && (
              <p className="mb-3 text-sm italic text-[var(--text-muted)]">No activities yet.</p>
            )}
            <div className="flex flex-wrap gap-2">
              {group.options.map(opt => (
                <ActivityTag
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
            <div className="mt-3">
              {addingOption ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Activity name…"
                    value={newOptionName}
                    onChange={e => setNewOptionName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') void handleAddOption();
                      if (e.key === 'Escape') { setAddingOption(false); setNewOptionName(''); }
                    }}
                    className={cn(inputClass, 'min-w-[180px] flex-1')}
                  />
                  <Button
                    variant="default"
                    onClick={() => void handleAddOption()}
                    disabled={!newOptionName.trim() || savingOption}
                    className="h-auto py-1.5 px-3 text-xs"
                  >
                    {savingOption ? 'Adding…' : 'Add'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => { setAddingOption(false); setNewOptionName(''); }}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingOption(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-muted)] transition-colors hover:border-[var(--accent-600)] hover:text-[var(--accent-600)]"
                >
                  <Plus size={12} /> Add activity
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const ActivityCustomizer = () => {
  const {
    groups, loading,
    createGroup, createGroupOption,
    updateGroup, updateGroupOption,
    deleteGroup, deleteGroupOption,
    reorderGroups, reorderGroupOptions,
  } = useGroups();

  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [draggingGroupId, setDraggingGroupId] = useState<number | null>(null);
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState<GroupType>('category');
  const [savingGroup, setSavingGroup] = useState(false);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  // Auto-select first group; recover if selected group was deleted
  useEffect(() => {
    if (groups.length === 0) return;
    if (!selectedGroupId || !groups.find(g => g.id === selectedGroupId)) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  const selectedGroup = groups.find(g => g.id === selectedGroupId) ?? null;

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return;
    setSavingGroup(true);
    const ok = newGroupType === 'slider'
      ? await createGroup(newGroupName.trim(), { type: 'slider', slider_min: 1, slider_max: 5, slider_labels: ['', '', '', '', ''] })
      : await createGroup(newGroupName.trim());
    if (ok) { setNewGroupName(''); setNewGroupType('category'); setAddingGroup(false); }
    setSavingGroup(false);
  };

  const dropGroup = (targetId: number) => {
    if (!draggingGroupId) return;
    reorderGroups(reorderIds(groups.map(g => g.id), draggingGroupId, targetId));
    setDraggingGroupId(null);
  };

  const handleDeleteGroup = (id: number) => {
    deleteGroup(id);
    if (selectedGroupId === id) setSelectedGroupId(null);
  };

  if (loading && groups.length === 0) {
    return <p className="mt-3 text-sm text-[var(--text-muted)]">Loading…</p>;
  }

  return (
    <div className="mt-3 flex flex-col overflow-hidden rounded-xl border border-[var(--border)] md:flex-row" style={{ minHeight: '420px' }}>
      {/* ── Left panel: group list ── */}
      <div className={cn(
        'flex flex-col bg-[var(--bg)]',
        'md:w-52 md:shrink-0 md:border-r md:border-[var(--border)]',
        mobileShowDetail ? 'hidden md:flex' : 'flex',
      )}>
        <div className="border-b border-[var(--border)] px-3 py-2.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Groups</span>
        </div>
        <div className="flex-1 overflow-y-auto p-1.5 flex flex-col gap-px">
          {groups.map(group => (
            <GroupListRow
              key={group.id}
              group={group}
              isSelected={selectedGroupId === group.id}
              isDragging={draggingGroupId === group.id}
              onSelect={() => { setSelectedGroupId(group.id); setMobileShowDetail(true); }}
              onDragStart={setDraggingGroupId}
              onDropOn={dropGroup}
            />
          ))}
        </div>

        {/* Add group */}
        <div className="border-t border-[var(--border)] p-1.5">
          {addingGroup ? (
            <div className="flex flex-col gap-1.5 p-1">
              <div className="flex rounded-full border border-[var(--border)] bg-[var(--surface)] p-0.5 text-xs">
                {(['category', 'slider'] as GroupType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNewGroupType(t)}
                    className={cn(
                      'flex-1 rounded-full px-2 py-1 capitalize transition-colors',
                      newGroupType === t ? 'bg-[var(--accent-bg)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text)]',
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <input
                autoFocus
                type="text"
                placeholder="Group name…"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') void handleAddGroup();
                  if (e.key === 'Escape') { setAddingGroup(false); setNewGroupName(''); }
                }}
                className={cn(inputClass, 'w-full text-sm')}
              />
              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  onClick={() => void handleAddGroup()}
                  disabled={!newGroupName.trim() || savingGroup}
                  className="h-auto flex-1 py-1.5 text-xs"
                >
                  {savingGroup ? 'Creating…' : 'Create'}
                </Button>
                <button
                  type="button"
                  onClick={() => { setAddingGroup(false); setNewGroupName(''); setNewGroupType('category'); }}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingGroup(true)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs text-[var(--text-muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--accent-600)]"
            >
              <Plus size={13} /> Add group
            </button>
          )}
        </div>
      </div>

      {/* ── Right panel: group detail ── */}
      <div className={cn(
        'min-w-0 flex-1 bg-[var(--surface)]',
        mobileShowDetail ? 'flex flex-col' : 'hidden md:flex md:flex-col md:border-l-0',
      )}>
        {selectedGroup ? (
          <GroupDetail
            group={selectedGroup}
            onUpdate={updateGroup}
            onDelete={handleDeleteGroup}
            onUpdateOption={updateGroupOption}
            onDeleteOption={deleteGroupOption}
            onReorderOptions={reorderGroupOptions}
            onAddOption={createGroupOption}
            onBack={() => setMobileShowDetail(false)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
            Select a group to edit
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityCustomizer;
