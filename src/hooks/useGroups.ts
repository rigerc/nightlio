import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as groupService from '../services/groupService';
import type { Group, GroupType } from '../types';

export const GROUPS_QUERY_KEY = ['groups'] as const;

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
  updateGroup: (groupId: number, data: Parameters<typeof groupService.updateGroup>[1]) => Promise<boolean>;
  updateGroupOption: (optionId: number, data: Parameters<typeof groupService.updateGroupOption>[1]) => Promise<boolean>;
  deleteGroup: (groupId: number) => Promise<boolean>;
  deleteGroupOption: (optionId: number) => Promise<boolean>;
  reorderGroups: (orderedIds: number[]) => Promise<void>;
  reorderGroupOptions: (groupId: number, orderedIds: number[]) => Promise<void>;
  refreshGroups: () => Promise<void>;
}

export const useGroups = (): UseGroupsReturn => {
  const queryClient = useQueryClient();

  const { data: groups = [], isLoading, error } = useQuery({
    queryKey: GROUPS_QUERY_KEY,
    queryFn: groupService.getGroups,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY });

  const createGroupMutation = useMutation({
    mutationFn: ({ name, options }: { name: string; options?: CreateGroupOptions }) =>
      groupService.createGroup({ name, ...options }),
    onSuccess: () => invalidate(),
  });

  const createGroupOptionMutation = useMutation({
    mutationFn: ({ groupId, name }: { groupId: number; name: string }) =>
      groupService.createGroupOption(groupId, name),
    onSuccess: () => invalidate(),
  });

  const updateGroupMutation = useMutation({
    mutationFn: ({ groupId, data }: { groupId: number; data: Parameters<typeof groupService.updateGroup>[1] }) =>
      groupService.updateGroup(groupId, data),
    onSuccess: () => invalidate(),
  });

  const updateGroupOptionMutation = useMutation({
    mutationFn: ({ optionId, data }: { optionId: number; data: Parameters<typeof groupService.updateGroupOption>[1] }) =>
      groupService.updateGroupOption(optionId, data),
    onSuccess: () => invalidate(),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (groupId: number) => groupService.deleteGroup(groupId),
    onSuccess: () => invalidate(),
  });

  const deleteGroupOptionMutation = useMutation({
    mutationFn: (optionId: number) => groupService.deleteGroupOption(optionId),
    onSuccess: () => invalidate(),
  });

  const reorderGroupsMutation = useMutation({
    mutationFn: (orderedIds: number[]) => groupService.reorderGroups(orderedIds),
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey: GROUPS_QUERY_KEY });
      const prev = queryClient.getQueryData<Group[]>(GROUPS_QUERY_KEY);
      queryClient.setQueryData<Group[]>(GROUPS_QUERY_KEY, (old) =>
        orderedIds.map((id) => old?.find((g) => g.id === id)).filter((g): g is Group => !!g)
      );
      return { prev };
    },
    onError: (_err, _ids, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(GROUPS_QUERY_KEY, ctx.prev);
    },
    onSettled: () => invalidate(),
  });

  const reorderGroupOptionsMutation = useMutation({
    mutationFn: ({ groupId, orderedIds }: { groupId: number; orderedIds: number[] }) =>
      groupService.reorderGroupOptions(groupId, orderedIds),
    onSettled: () => invalidate(),
  });

  return {
    groups,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    createGroup: async (name, options) => {
      try {
        await createGroupMutation.mutateAsync({ name, options });
        return true;
      } catch { return false; }
    },
    createGroupOption: async (groupId, name) => {
      try {
        await createGroupOptionMutation.mutateAsync({ groupId, name });
        return true;
      } catch { return false; }
    },
    updateGroup: async (groupId, data) => {
      try {
        await updateGroupMutation.mutateAsync({ groupId, data });
        return true;
      } catch { return false; }
    },
    updateGroupOption: async (optionId, data) => {
      try {
        await updateGroupOptionMutation.mutateAsync({ optionId, data });
        return true;
      } catch { return false; }
    },
    deleteGroup: async (groupId) => {
      try {
        await deleteGroupMutation.mutateAsync(groupId);
        return true;
      } catch { return false; }
    },
    deleteGroupOption: async (optionId) => {
      try {
        await deleteGroupOptionMutation.mutateAsync(optionId);
        return true;
      } catch { return false; }
    },
    reorderGroups: (orderedIds) => reorderGroupsMutation.mutateAsync(orderedIds),
    reorderGroupOptions: (groupId, orderedIds) =>
      reorderGroupOptionsMutation.mutateAsync({ groupId, orderedIds }),
    refreshGroups: () => invalidate(),
  };
};
