import { Tabs } from 'expo-router';
import { Home, Target, BarChart2, Trophy, Settings } from 'lucide-react-native';
import { useColorScheme } from 'react-native';

const ACTIVE = '#8b5cf6';
const INACTIVE = '#6b7280';

export default function TabsLayout() {
  const colorScheme = useColorScheme();
  const bg = colorScheme === 'dark' ? '#0a0a0a' : '#ffffff';
  const border = colorScheme === 'dark' ? '#1f1f1f' : '#e5e7eb';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: { backgroundColor: bg, borderTopColor: border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: 'Goals',
          tabBarIcon: ({ color, size }) => <Target color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color, size }) => <BarChart2 color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="achievements"
        options={{
          title: 'Achievements',
          tabBarIcon: ({ color, size }) => <Trophy color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
