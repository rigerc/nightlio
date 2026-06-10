import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Wifi, WifiOff, RefreshCw, Unlink } from 'lucide-react-native';
import { useFitnessData } from '../../hooks/useFitnessData';

export function FitnessSection() {
  const { connection, loading, syncing, error, connect, sync, disconnect } = useFitnessData(true);

  if (loading) {
    return (
      <View className="py-2 items-center">
        <ActivityIndicator size="small" />
      </View>
    );
  }

  const lastSync = connection?.last_synced_at
    ? new Date(connection.last_synced_at).toLocaleDateString()
    : null;

  return (
    <View>
      <Text className="text-sm text-muted-foreground mb-3">
        Connect to Google Health Connect to automatically sync your fitness data with journal entries.
      </Text>

      {error && (
        <Text className="text-destructive text-sm mb-3">{error}</Text>
      )}

      {connection?.connected ? (
        <View>
          <View className="flex-row items-center gap-2 mb-3">
            <Wifi size={18} color="#22c55e" />
            <Text className="text-green-500 font-medium">Connected</Text>
            {lastSync && (
              <Text className="text-muted-foreground text-sm">· Last sync: {lastSync}</Text>
            )}
          </View>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => sync(30)}
              disabled={syncing}
              className="flex-1 flex-row items-center justify-center gap-2 bg-primary py-2.5 rounded-xl"
            >
              {syncing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <RefreshCw size={15} color="white" />
                  <Text className="text-white font-semibold text-sm">Sync now</Text>
                </>
              )}
            </Pressable>
            <Pressable
              onPress={disconnect}
              className="flex-row items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border"
            >
              <Unlink size={15} color="#6b7280" />
              <Text className="text-muted-foreground text-sm">Disconnect</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={connect}
          className="flex-row items-center gap-3 bg-card border border-border rounded-xl px-4 py-3"
        >
          <WifiOff size={20} color="#6b7280" />
          <Text className="text-foreground font-medium">Connect Health Connect</Text>
        </Pressable>
      )}
    </View>
  );
}
