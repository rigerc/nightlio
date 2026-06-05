import { useState, useEffect } from 'react';
import apiService from '../services/api';

export const useGroups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadGroups = async () => {
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

  const createGroup = async (name) => {
    try {
      await apiService.createGroup({ name });
      await loadGroups();
      return true;
    } catch (err) {
      console.error('Failed to create group:', err);
      setError('Failed to create category');
      return false;
    }
  };

  const createGroupOption = async (groupId, name) => {
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

  const updateGroup = async (groupId, data) => {
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

  const updateGroupOption = async (optionId, data) => {
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

  const deleteGroup = async (groupId) => {
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

  const deleteGroupOption = async (optionId) => {
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

  const reorderGroups = async (orderedIds) => {
    const ordered = orderedIds.map(id => groups.find(g => g.id === id)).filter(Boolean);
    setGroups(ordered);
    try {
      await apiService.reorderGroups(orderedIds);
    } catch (err) {
      console.error('Failed to reorder groups:', err);
      await loadGroups();
    }
  };

  const reorderGroupOptions = async (groupId, orderedIds) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      const ordered = orderedIds.map(id => g.options.find(o => o.id === id)).filter(Boolean);
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
    loadGroups();
  }, []);

  return {
    groups,
    loading,
    error,
    createGroup,
    createGroupOption,
    updateGroup,
    updateGroupOption,
    deleteGroup,
    deleteGroupOption,
    reorderGroups,
    reorderGroupOptions,
    refreshGroups: loadGroups,
  };
};
