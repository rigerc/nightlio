import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList, Alert, ActivityIndicator,
} from 'react-native';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react-native';
import { useGroups } from '../../hooks/useGroups';
import type { Group } from '../../types';

function GroupRow({
  group,
  onDelete,
  onAddOption,
  onDeleteOption,
}: {
  group: Group;
  onDelete: () => void;
  onAddOption: (name: string) => void;
  onDeleteOption: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [newOption, setNewOption] = useState('');

  const handleAddOption = () => {
    const name = newOption.trim();
    if (!name) return;
    onAddOption(name);
    setNewOption('');
  };

  const color = group.color ?? '#8b5cf6';

  return (
    <View className="bg-card border border-border rounded-xl mb-3 overflow-hidden">
      <Pressable
        onPress={() => setExpanded((p) => !p)}
        className="flex-row items-center px-4 py-3"
      >
        <View className="flex-1 flex-row items-center gap-2">
          {expanded ? (
            <ChevronDown size={16} color={color} />
          ) : (
            <ChevronRight size={16} color={color} />
          )}
          <Text className="font-semibold text-foreground">{group.name}</Text>
          <View
            className="px-2 py-0.5 rounded-full"
            style={{ backgroundColor: color + '20' }}
          >
            <Text className="text-xs" style={{ color }}>
              {group.type}
            </Text>
          </View>
        </View>
        <Pressable onPress={onDelete} hitSlop={8}>
          <Trash2 size={15} color="#ef4444" />
        </Pressable>
      </Pressable>

      {expanded && group.type === 'category' && (
        <View className="px-4 pb-3 border-t border-border">
          {group.options.map((opt) => (
            <View key={opt.id} className="flex-row items-center justify-between py-2">
              <Text className="text-foreground">{opt.name}</Text>
              <Pressable onPress={() => onDeleteOption(opt.id)} hitSlop={8}>
                <Trash2 size={13} color="#6b7280" />
              </Pressable>
            </View>
          ))}
          <View className="flex-row items-center gap-2 mt-2">
            <TextInput
              value={newOption}
              onChangeText={setNewOption}
              placeholder="Add option..."
              placeholderTextColor="#6b7280"
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm"
              onSubmitEditing={handleAddOption}
              returnKeyType="done"
            />
            <Pressable
              onPress={handleAddOption}
              className="bg-primary p-2 rounded-lg"
            >
              <Plus size={16} color="white" />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

export function ActivityCustomizer() {
  const {
    groups,
    loading,
    createGroup,
    createGroupOption,
    deleteGroup,
    deleteGroupOption,
  } = useGroups();

  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState<'category' | 'slider'>('category');
  const [adding, setAdding] = useState(false);

  const handleAddGroup = async () => {
    const name = newGroupName.trim();
    if (!name) return;
    setAdding(true);
    try {
      await createGroup(name, { type: newGroupType });
      setNewGroupName('');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = (groupId: number, groupName: string) => {
    Alert.alert('Delete Group', `Delete "${groupName}" and all its options?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteGroup(groupId) },
    ]);
  };

  if (loading) return <ActivityIndicator />;

  return (
    <View>
      <FlatList
        data={groups}
        scrollEnabled={false}
        keyExtractor={(g) => String(g.id)}
        renderItem={({ item: g }) => (
          <GroupRow
            group={g}
            onDelete={() => handleDelete(g.id, g.name)}
            onAddOption={(name) => createGroupOption(g.id, name)}
            onDeleteOption={(id) => deleteGroupOption(id)}
          />
        )}
        ListEmptyComponent={
          <Text className="text-muted-foreground text-sm mb-4">
            No groups yet. Create one below.
          </Text>
        }
      />

      {/* Add group */}
      <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Add Group
      </Text>
      <View className="flex-row gap-2 mb-2">
        {(['category', 'slider'] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setNewGroupType(t)}
            className={`flex-1 py-2 rounded-lg border items-center ${
              newGroupType === t ? 'bg-primary border-primary' : 'bg-card border-border'
            }`}
          >
            <Text className={`text-sm font-medium ${newGroupType === t ? 'text-white' : 'text-foreground'}`}>
              {t}
            </Text>
          </Pressable>
        ))}
      </View>
      <View className="flex-row gap-2">
        <TextInput
          value={newGroupName}
          onChangeText={setNewGroupName}
          placeholder="Group name..."
          placeholderTextColor="#6b7280"
          className="flex-1 bg-card border border-border rounded-xl px-4 py-2.5 text-foreground"
          onSubmitEditing={handleAddGroup}
          returnKeyType="done"
        />
        <Pressable
          onPress={handleAddGroup}
          disabled={adding || !newGroupName.trim()}
          className="bg-primary px-4 rounded-xl items-center justify-center"
        >
          {adding ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Plus size={20} color="white" />
          )}
        </Pressable>
      </View>
    </View>
  );
}
