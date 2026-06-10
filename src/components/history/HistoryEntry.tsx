import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Star } from 'lucide-react-native';
import { MoodDisplay } from '../mood/MoodDisplay';
import { getIconComponent } from '../../utils/iconRegistry';
import type { Entry } from '../../types';

const stripMd = (s = '') =>
  s
    .replace(/`{1,3}[^`]*`{1,3}/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[(.*?)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[>\-+*]\s+/gm, '')
    .replace(/[*_~`>#[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function deriveTitleBody(content: string): { title: string; body: string } {
  const lines = content.trim().split('\n');
  const firstLine = lines[0] ?? '';
  const titleMatch = firstLine.match(/^#{1,6}\s+(.*)/);
  if (titleMatch) {
    return { title: titleMatch[1], body: lines.slice(1).join('\n').trim() };
  }
  if (firstLine.length > 0 && firstLine.length < 80) {
    return { title: firstLine, body: lines.slice(1).join('\n').trim() };
  }
  return { title: '', body: content.trim() };
}

interface HistoryEntryProps {
  entry: Entry;
  onPress?: () => void;
}

export function HistoryEntry({ entry, onPress }: HistoryEntryProps) {
  const router = useRouter();
  const handlePress = onPress ?? (() => router.push(`/entry/${entry.id}`));

  const { title: rawTitle, body: rawBody } = deriveTitleBody(entry.content ?? '');
  const title = stripMd(rawTitle).slice(0, 80);
  const excerpt = stripMd(rawBody).slice(0, 200);

  return (
    <Pressable
      onPress={handlePress}
      className="mx-4 mb-3 p-4 bg-card border border-border rounded-xl active:opacity-70"
    >
      {/* Header row */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          <MoodDisplay moodValue={entry.mood} size={20} showLabel={false} />
          <Text className="font-semibold text-foreground">{entry.date}</Text>
        </View>
        {entry.is_important && <Star size={16} color="#f59e0b" fill="#f59e0b" />}
      </View>

      {/* Content */}
      {title ? (
        <Text className="text-foreground font-medium mb-1" numberOfLines={1}>{title}</Text>
      ) : null}
      {excerpt ? (
        <Text className="text-muted-foreground text-sm" numberOfLines={2}>{excerpt}</Text>
      ) : null}

      {/* Tags */}
      {(entry.selections?.length ?? 0) > 0 && (
        <View className="flex-row flex-wrap gap-1 mt-2">
          {entry.selections.slice(0, 6).map((sel) => {
            const Icon = sel.icon ? getIconComponent(sel.icon) : null;
            return (
              <View
                key={sel.id}
                className="flex-row items-center gap-1 px-2 py-0.5 rounded-full bg-muted"
              >
                {Icon && <Icon size={12} color="#6b7280" />}
                <Text className="text-xs text-muted-foreground">{sel.name}</Text>
              </View>
            );
          })}
        </View>
      )}
    </Pressable>
  );
}
