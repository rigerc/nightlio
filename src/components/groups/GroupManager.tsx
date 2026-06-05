import { useState } from 'react';
import { Settings, X } from 'lucide-react';
import { Button } from '../ui/button';
import type { Group } from '../../types';

const inputClass =
  'flex-1 px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] outline-none focus:border-[var(--accent-600)] focus:ring-2 focus:ring-[var(--accent-600)]/20 transition-colors';

interface GroupManagerProps {
  groups: Group[];
  onCreateGroup: (name: string) => Promise<boolean>;
  onCreateOption: (groupId: number, name: string) => Promise<boolean>;
}

const GroupManager = ({ groups, onCreateGroup, onCreateOption }: GroupManagerProps) => {
  const [showManager, setShowManager] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newOptionName, setNewOptionName] = useState('');
  const [selectedGroupForOption, setSelectedGroupForOption] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isCreatingOption, setIsCreatingOption] = useState(false);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    setIsCreatingGroup(true);
    try {
      const success = await onCreateGroup(newGroupName.trim());
      if (success) setNewGroupName('');
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleCreateOption = async () => {
    if (!newOptionName.trim() || !selectedGroupForOption) return;
    const groupIdNum = parseInt(selectedGroupForOption, 10);
    if (!Number.isFinite(groupIdNum)) return;
    setIsCreatingOption(true);
    try {
      const success = await onCreateOption(groupIdNum, newOptionName.trim());
      if (success) { setNewOptionName(''); setSelectedGroupForOption(''); }
    } finally {
      setIsCreatingOption(false);
    }
  };

  if (!showManager) {
    return (
      <div className="text-center mt-4">
        <Button variant="default" onClick={() => setShowManager(true)} className="gap-2 rounded-full">
          <Settings size={16} />
          Manage Categories
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface)] rounded-2xl p-6 border border-[var(--border)] shadow-md mt-4">
      <div className="flex justify-between items-center mb-6">
        <h3 className="m-0 text-[var(--text)] text-lg font-semibold">Manage Categories</h3>
        <button onClick={() => setShowManager(false)} className="bg-transparent border-none cursor-pointer text-[var(--text-muted)] p-1 hover:text-[var(--text)] transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="mb-8">
        <h4 className="mt-0 mb-3 text-[var(--text)] text-sm font-semibold opacity-90">Create New Category</h4>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Category name (e.g., Activities, Weather)"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleCreateGroup()}
            className={inputClass}
          />
          <Button variant="default" onClick={() => void handleCreateGroup()} disabled={!newGroupName.trim() || isCreatingGroup} className="shrink-0">
            {isCreatingGroup ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </div>

      {groups.length > 0 && (
        <div className="mb-8">
          <h4 className="mt-0 mb-3 text-[var(--text)] text-sm font-semibold opacity-90">Add Option to Category</h4>
          <div className="flex gap-2 items-center flex-wrap">
            <select
              value={selectedGroupForOption}
              onChange={(e) => setSelectedGroupForOption(e.target.value)}
              className={`${inputClass} flex-none min-w-[150px]`}
            >
              <option value="">Select category…</option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Option name (e.g., happy, tired)"
              value={newOptionName}
              onChange={(e) => setNewOptionName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleCreateOption()}
              className={inputClass}
            />
            <Button variant="default" onClick={() => void handleCreateOption()} disabled={!newOptionName.trim() || !selectedGroupForOption || isCreatingOption} className="shrink-0">
              {isCreatingOption ? 'Adding…' : 'Add'}
            </Button>
          </div>
        </div>
      )}

      {groups.length > 0 && (
        <div>
          <h4 className="mt-0 mb-3 text-[var(--text)] text-sm font-semibold opacity-90">Current Categories</h4>
          <div className="flex flex-col gap-3">
            {groups.map(group => (
              <div key={group.id} className="p-4 bg-[var(--bg)] rounded-lg border border-[var(--border)]">
                <div className="font-semibold text-[var(--text)] mb-2">
                  {group.name} <span className="font-normal text-[var(--text-muted)]">({group.options.length} options)</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {group.options.map(option => (
                    <span key={option.id} className="px-2 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-muted)]">
                      {option.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupManager;
