import { ScrollView, View, Text, Pressable } from 'react-native';
import { CartesianChart, Line, Bar } from 'victory-native';
import useStatisticsViewData from './useStatisticsViewData';
import {
  RANGE_OPTIONS,
  MOOD_LEGEND,
  MOOD_FULL_LABELS,
  WEEK_DAYS,
} from './statisticsViewUtils';
import type {
  CalendarDay,
  MoodDistributionDatum,
  OverviewCard,
  TagStats,
  WeeklyDigest,
} from './statisticsViewUtils';
import type { Entry, Statistics } from '../../types';

interface StatisticsViewProps {
  statistics: Statistics | null;
  pastEntries: Entry[];
  range: number;
  onRangeChange: (r: number) => void;
}

function OverviewCards({ cards }: { cards: OverviewCard[] }) {
  return (
    <View className="flex-row flex-wrap gap-3 px-4 mb-4">
      {cards.map(({ key, value, label, helperText }) => (
        <View
          key={key}
          className="flex-1 min-w-[40%] bg-card border border-border rounded-xl p-4"
        >
          <Text className="text-2xl font-bold text-foreground">{String(value)}</Text>
          <Text className="text-sm text-muted-foreground mt-0.5">{label}</Text>
          {helperText && (
            <Text className="text-xs text-primary mt-1">{helperText}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

function RangeSelector({ range, onChange }: { range: number; onChange: (r: number) => void }) {
  return (
    <View className="flex-row gap-2">
      {RANGE_OPTIONS.map((opt) => (
        <Pressable
          key={opt}
          onPress={() => onChange(opt)}
          className={`px-3 py-1 rounded-full border ${
            range === opt ? 'bg-primary border-primary' : 'bg-card border-border'
          }`}
        >
          <Text className={`text-sm font-medium ${range === opt ? 'text-white' : 'text-foreground'}`}>
            {opt}d
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function SectionCard({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View className="mx-4 mb-4 bg-card border border-border rounded-xl p-4">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="font-semibold text-foreground text-base">{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

function MoodLegendRow() {
  return (
    <View className="flex-row justify-between mt-3 flex-wrap gap-1">
      {MOOD_LEGEND.map(({ value, color, label }) => (
        <View key={value} className="flex-row items-center gap-1">
          <View className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <Text className="text-xs text-muted-foreground">{label}</Text>
        </View>
      ))}
    </View>
  );
}

function TrendChart({ data, range, onChangeRange }: { data: object[]; range: number; onChangeRange: (r: number) => void }) {
  return (
    <SectionCard title="Mood Trend" right={<RangeSelector range={range} onChange={onChangeRange} />}>
      {data.length > 1 ? (
        <View style={{ height: 200 }}>
          <CartesianChart
            data={data as Array<{ date: string; mood: number | null; ma: number | null }>}
            xKey="date"
            yKeys={['mood', 'ma']}
            domainPadding={{ top: 20, bottom: 10 }}
            domain={{ y: [0.5, 5.5] }}
          >
            {({ points }) => (
              <>
                <Line
                  points={points.mood}
                  color="#8b5cf6"
                  strokeWidth={3}
                  connectMissingData={false}
                />
                <Line
                  points={points.ma}
                  color="#ef4444"
                  strokeWidth={2}
                  strokeDasharray={[6, 3]}
                  connectMissingData
                />
              </>
            )}
          </CartesianChart>
        </View>
      ) : (
        <View className="h-24 items-center justify-center">
          <Text className="text-muted-foreground text-sm">Not enough data yet</Text>
        </View>
      )}
      <MoodLegendRow />
    </SectionCard>
  );
}

function DistributionChart({ data }: { data: MoodDistributionDatum[] }) {
  const hasData = data.some((d) => d.count > 0);
  return (
    <SectionCard title="Mood Distribution">
      {hasData ? (
        <View style={{ height: 180 }}>
          <CartesianChart
            data={data}
            xKey="mood"
            yKeys={['count']}
            domainPadding={{ left: 20, right: 20, top: 20 }}
          >
            {({ points, chartBounds }) => (
              <Bar
                points={points.count}
                chartBounds={chartBounds}
                roundedCorners={{ topLeft: 4, topRight: 4 }}
                color="#8b5cf6"
              />
            )}
          </CartesianChart>
        </View>
      ) : (
        <View className="h-24 items-center justify-center">
          <Text className="text-muted-foreground text-sm">Log more entries to see your distribution</Text>
        </View>
      )}
      <MoodLegendRow />
    </SectionCard>
  );
}

const CONFIDENCE_LABELS: Record<string, string> = {
  low: 'early',
  medium: 'some signal',
  high: 'consistent',
};

function TagCorrelations({ tagStats }: { tagStats: TagStats }) {
  if (!tagStats.topPositive.length && !tagStats.topNegative.length) return null;
  return (
    <SectionCard title="Tags & Mood">
      {tagStats.topPositive.length > 0 && (
        <>
          <Text className="text-xs font-semibold text-green-500 mb-1">Better days</Text>
          {tagStats.topPositive.slice(0, 3).map((tag) => (
            <View key={tag.tag} className="flex-row justify-between py-1">
              <Text className="text-foreground text-sm">{tag.tag}</Text>
              <Text className="text-sm text-green-500">
                {tag.avgMood.toFixed(1)} · {CONFIDENCE_LABELS[tag.confidence]}
              </Text>
            </View>
          ))}
        </>
      )}
      {tagStats.topNegative.length > 0 && (
        <>
          <Text className="text-xs font-semibold text-red-400 mt-2 mb-1">Harder days</Text>
          {tagStats.topNegative.slice(0, 3).map((tag) => (
            <View key={tag.tag} className="flex-row justify-between py-1">
              <Text className="text-foreground text-sm">{tag.tag}</Text>
              <Text className="text-sm text-red-400">
                {tag.avgMood.toFixed(1)} · {CONFIDENCE_LABELS[tag.confidence]}
              </Text>
            </View>
          ))}
        </>
      )}
    </SectionCard>
  );
}

function WeeklyDigestSection({ digest }: { digest: WeeklyDigest }) {
  const hasContent =
    digest.bestDay || digest.hardestDay || digest.topActivities.length > 0 || digest.trendComparison;
  if (!hasContent) return null;

  return (
    <SectionCard title="This Week">
      {digest.bestDay && (
        <View className="flex-row justify-between py-1">
          <Text className="text-muted-foreground text-sm">Best day</Text>
          <Text className="text-foreground text-sm">
            {digest.bestDay.label} — {MOOD_FULL_LABELS[digest.bestDay.mood]}
          </Text>
        </View>
      )}
      {digest.hardestDay && (
        <View className="flex-row justify-between py-1">
          <Text className="text-muted-foreground text-sm">Hardest day</Text>
          <Text className="text-foreground text-sm">
            {digest.hardestDay.label} — {MOOD_FULL_LABELS[digest.hardestDay.mood]}
          </Text>
        </View>
      )}
      {digest.topActivities.length > 0 && (
        <View className="flex-row justify-between py-1">
          <Text className="text-muted-foreground text-sm">Top activities</Text>
          <Text className="text-foreground text-sm flex-1 text-right ml-4" numberOfLines={2}>
            {digest.topActivities.map((a) => a.tag).join(', ')}
          </Text>
        </View>
      )}
      {digest.trendComparison && (
        <View className="flex-row justify-between py-1">
          <Text className="text-muted-foreground text-sm">vs last week</Text>
          <Text className="text-foreground text-sm">{digest.trendComparison}</Text>
        </View>
      )}
    </SectionCard>
  );
}

function MoodCalendar({ days }: { days: CalendarDay[] }) {
  return (
    <View className="mx-4 mb-4 bg-card border border-border rounded-xl p-4">
      <Text className="font-semibold text-foreground text-base mb-3">Mood Calendar</Text>
      <View className="flex-row">
        {WEEK_DAYS.map((d) => (
          <View key={d} className="flex-1 items-center mb-1">
            <Text className="text-xs text-muted-foreground">{d}</Text>
          </View>
        ))}
      </View>
      <View className="flex-row flex-wrap">
        {days.map(({ key, label, moodColor, isCurrentMonth, isToday }) => (
          <View
            key={key}
            className={`items-center justify-center rounded-lg m-0.5 ${isToday ? 'border border-primary' : ''}`}
            style={{
              width: '13%',
              aspectRatio: 1,
              backgroundColor: moodColor ? moodColor + '30' : undefined,
              opacity: isCurrentMonth ? 1 : 0.3,
            }}
          >
            <Text
              className="text-xs font-medium"
              style={{ color: moodColor ?? '#6b7280' }}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function StatisticsView({ statistics, pastEntries, range, onRangeChange }: StatisticsViewProps) {
  const {
    hasStatistics,
    trendChartData,
    moodDistributionData,
    tagStats,
    calendarDays,
    overviewCards,
    weeklyDigest,
  } = useStatisticsViewData(statistics, pastEntries, range);

  if (!hasStatistics) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <Text className="text-muted-foreground text-center">
          Log a few entries to see your statistics here.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}>
      <OverviewCards cards={overviewCards} />
      <TrendChart data={trendChartData} range={range} onChangeRange={onRangeChange} />
      <DistributionChart data={moodDistributionData} />
      <WeeklyDigestSection digest={weeklyDigest} />
      <TagCorrelations tagStats={tagStats} />
      <MoodCalendar days={calendarDays} />
    </ScrollView>
  );
}
