import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMoodData } from '../../src/hooks/useMoodData';
import { useStatistics } from '../../src/hooks/useStatistics';
import { StatisticsView } from '../../src/components/stats/StatisticsView';
import { RANGE_OPTIONS } from '../../src/components/stats/statisticsViewUtils';

export default function StatsScreen() {
  const [range, setRange] = useState<number>(RANGE_OPTIONS[1]);
  const { pastEntries } = useMoodData();
  const { statistics } = useStatistics();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <StatisticsView
        statistics={statistics}
        pastEntries={pastEntries}
        range={range}
        onRangeChange={setRange}
      />
    </SafeAreaView>
  );
}
