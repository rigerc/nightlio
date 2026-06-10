import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoalsList } from '../../src/components/goals/GoalsList';

export default function GoalsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <GoalsList />
    </SafeAreaView>
  );
}
