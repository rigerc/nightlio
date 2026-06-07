import { useState, useEffect } from 'react';
import apiService from '../services/api';
import type { Group, GroupType } from '../types';

export interface CreateGroupOptions {
  type?: GroupType;
  slider_min?: number;
  slider_max?: number;
  slider_labels?: string[];
}

export interface UseGroupsReturn {
  groups: Group[];
  loading: boolean;
  error: string | null;
  createGroup: (name: string, options?: CreateGroupOptions) => Promise<boolean>;
  createGroupOption: (groupId: number, name: string) => Promise<boolean>;
  updateGroup: (groupId: number, data: Partial<{ name: string; color: string; icon: string; sort_order: number; type: GroupType; slider_min: number; slider_max: number; slider_labels: string[] | null }>) => Promise<boolean>;
  updateGroupOption: (optionId: number, data: Partial<{ name: string; icon: string; sort_order: number }>) => Promise<boolean>;
  deleteGroup: (groupId: number) => Promise<boolean>;
  deleteGroupOption: (optionId: number) => Promise<boolean>;
  reorderGroups: (orderedIds: number[]) => Promise<void>;
  reorderGroupOptions: (groupId: number, orderedIds: number[]) => Promise<void>;
  refreshGroups: () => Promise<void>;
}

export const useGroups = (): UseGroupsReturn => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGroups = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getGroups();
      setGroups(data);
    } catch (err) {
      console.error('Failed to load groups:', err);
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async (name: string, options?: CreateGroupOptions): Promise<boolean> => {
    try {
      await apiService.createGroup({ name, ...options });
      await loadGroups();
      return true;
    } catch (err) {
      console.error('Failed to create group:', err);
      setError('Failed to create category');
      return false;
    }
  };

  const createGroupOption = async (groupId: number, name: string): Promise<boolean> => {
    try {
      await apiService.createGroupOption(groupId, { name });
      await loadGroups();
      return true;
    } catch (err) {
      console.error('Failed to create group option:', err);
      setError('Failed to create option');
      return false;
    }
  };

  const updateGroup = async (groupId: number, data: Partial<{ name: string; color: string; icon: string; sort_order: number; type: GroupType; slider_min: number; slider_max: number; slider_labels: string[] | null }>): Promise<boolean> => {
    try {
      await apiService.updateGroup(groupId, data);
      await loadGroups();
      return true;
    } catch (err) {
      console.error('Failed to update group:', err);
      setError('Failed to update category');
      return false;
    }
  };

  const updateGroupOption = async (optionId: number, data: Partial<{ name: string; icon: string; sort_order: number }>): Promise<boolean> => {
    try {
      await apiService.updateGroupOption(optionId, data);
      await loadGroups();
      return true;
    } catch (err) {
      console.error('Failed to update option:', err);
      setError('Failed to update option');
      return false;
    }
  };

  const deleteGroup = async (groupId: number): Promise<boolean> => {
    try {
      await apiService.deleteGroup(groupId);
      await loadGroups();
      return true;
    } catch (err) {
      console.error('Failed to delete group:', err);
      setError('Failed to delete category');
      return false;
    }
  };

  const deleteGroupOption = async (optionId: number): Promise<boolean> => {
    try {
      await apiService.deleteGroupOption(optionId);
      await loadGroups();
      return true;
    } catch (err) {
      console.error('Failed to delete option:', err);
      setError('Failed to delete option');
      return false;
    }
  };

  const reorderGroups = async (orderedIds: number[]): Promise<void> => {
    const ordered = orderedIds.map(id => groups.find(g => g.id === id)).filter((g): g is Group => g !== undefined);
    setGroups(ordered);
    try {
      await apiService.reorderGroups(orderedIds);
    } catch (err) {
      console.error('Failed to reorder groups:', err);
      await loadGroups();
    }
  };

  const reorderGroupOptions = async (groupId: number, orderedIds: number[]): Promise<void> => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      const ordered = orderedIds.map(id => g.options.find(o => o.id === id)).filter((o): o is NonNullable<typeof o> => o !== undefined);
      return { ...g, options: ordered };
    }));
    try {
      await apiService.reorderGroupOptions(groupId, orderedIds);
    } catch (err) {
      console.error('Failed to reorder options:', err);
      await loadGroups();
    }
  };

  useEffect(() => {
    void loadGroups();
  }, []);

  return {
    groups, loading, error,
    createGroup, createGroupOption, updateGroup, updateGroupOption,
    deleteGroup, deleteGroupOption, reorderGroups, reorderGroupOptions,
    refreshGroups: loadGroups,
  };
};
