import { useCallback, useRef, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Cell,
} from 'recharts';
import Skeleton from '../ui/Skeleton';
import { exportSVGToPNG, exportDataToCSV } from '../../utils/exportUtils';
import useStatisticsViewData from './useStatisticsViewData';
import {
  RANGE_OPTIONS, TOOLTIP_STYLE, MOOD_LEGEND, MOOD_FULL_LABELS, MOOD_SHORTHANDS, WEEK_DAYS, formatTrendTooltip,
} from './statisticsViewUtils';
import type { CalendarDay, MoodDistributionDatum, OverviewCard, TagStats, WeeklyDigest } from './statisticsViewUtils';
import type { Entry, Statistics } from '../../types';
import './StatisticsView.css';

const MoodLegend = () => (
  <div className="statistics-view__legend">
    {MOOD_LEGEND.map(({ value, icon: LegendIcon, color, label }) => (
      <div key={value} className="statistics-view__legend-item">
        <LegendIcon size={16} style={{ color }} />
        <span>{label}</span>
      </div>
    ))}
  </div>
);

const StatisticsOverviewGrid = ({ cards }: { cards: OverviewCard[] }) => (
  <div className="statistics-view__overview-grid">
    {cards.map(({ key, value, label, helperText }) => (
      <div key={key} className="statistics-view__card statistics-view__overview-card">
        <div className="statistics-view__overview-value">{value}</div>
        <div className="statistics-view__overview-label">{label}</div>
        {helperText && <div className="statistics-view__overview-helper">{helperText}</div>}
      </div>
    ))}
  </div>
);

const SectionHeader = ({ title, children }: { title: string; children?: React.ReactNode }) => (
  <div className="statistics-view__section-header">
    <h3 className="statistics-view__section-title">{title}</h3>
    <div className="statistics-view__button-row">{children}</div>
  </div>
);

const RangeSelector = ({ range, onChange }: { range: number; onChange: (r: number) => void }) => (
  <div className="statistics-view__range-buttons">
    {RANGE_OPTIONS.map((option) => (
      <button
        key={option}
        type="button"
        onClick={() => onChange(option)}
        className={`statistics-view__range-button${range === option ? ' is-active' : ''}`}
      >
        {option}d
      </button>
    ))}
  </div>
);

interface MoodTrendSectionProps {
  chartData: object[];
  range: number;
  onChangeRange: (r: number) => void;
  onExportPNG: () => void;
  onExportCSV: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const MoodTrendSection = ({ chartData, range, onChangeRange, onExportPNG, onExportCSV, containerRef }: MoodTrendSectionProps) => (
  <div ref={containerRef} className="statistics-view__card statistics-view__section" id="mood-trend">
    <SectionHeader title="Mood Trend">
      <RangeSelector range={range} onChange={onChangeRange} />
      <button type="button" className="statistics-view__ghost-button" onClick={onExportPNG}>Export PNG</button>
      <button type="button" className="statistics-view__ghost-button" onClick={onExportCSV}>Export CSV</button>
    </SectionHeader>
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={{ stroke: 'var(--border)' }} />
        <YAxis domain={[0.5, 5.5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={{ stroke: 'var(--border)' }} width={20} tickFormatter={(value: number) => MOOD_SHORTHANDS[value] || ''} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={formatTrendTooltip as never} />
        <Line type="monotone" dataKey="mood" stroke="var(--accent-600)" strokeWidth={3} dot={{ fill: 'var(--accent-600)', strokeWidth: 2, r: 6 }} connectNulls={false} />
        <Line type="monotone" dataKey="ma" stroke="var(--danger)" strokeDasharray="6 6" strokeWidth={2} dot={false} connectNulls />
      </LineChart>
    </ResponsiveContainer>
    <MoodLegend />
  </div>
);

interface DistributionSectionProps {
  chartData: MoodDistributionDatum[];
  onExportPNG: () => void;
  onExportCSV: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const DistributionSection = ({ chartData, onExportPNG, onExportCSV, containerRef }: DistributionSectionProps) => (
  <div ref={containerRef} className="statistics-view__card statistics-view__section" id="mood-distribution">
    <SectionHeader title="Mood Distribution">
      <button type="button" className="statistics-view__ghost-button" onClick={onExportPNG}>Export PNG</button>
      <button type="button" className="statistics-view__ghost-button" onClick={onExportCSV}>Export CSV</button>
    </SectionHeader>
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={chartData} margin={{ top: 30, right: 20, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="mood" tick={{ fontSize: 16, fill: 'var(--text-muted)' }} axisLine={{ stroke: 'var(--border)' }} />
        <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={{ stroke: 'var(--border)' }} allowDecimals={false} domain={[0, 'dataMax + 1']} width={20} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: unknown, _name: unknown, props: { payload?: { label?: string } }) => [`${value} entries`, props.payload?.label ?? '']} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 12, fontWeight: 600, fill: 'var(--text)' }}>
          {chartData.map((entry) => <Cell key={entry.key} fill={entry.fill} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
    <MoodLegend />
  </div>
);

const CONFIDENCE_LABELS: Record<TagStats['topPositive'][number]['confidence'], string> = {
  low: 'early signal',
  medium: 'some signal',
  high: 'consistent pattern',
};

interface TagListProps {
  heading: string;
  toneClass: string;
  tags: TagStats['topPositive'];
  emptyLabel: string;
  valueColor: string;
}

const TagList = ({ heading, toneClass, tags, emptyLabel, valueColor }: TagListProps) => (
  <div className="statistics-view__tag-list">
    <h4 className={`statistics-view__tag-heading ${toneClass}`}>{heading}</h4>
    {tags.length === 0 && <div className="statistics-view__tag-empty">{emptyLabel}</div>}
    {tags.map((tag) => (
      <div key={tag.tag} className="statistics-view__tag-item">
        <span>{tag.tag}</span>
        <span>
          <span style={{ color: valueColor }}>{tag.avgMood.toFixed(2)} ({tag.count})</span>
          <span className="statistics-view__tag-confidence">{CONFIDENCE_LABELS[tag.confidence]}</span>
        </span>
      </div>
    ))}
  </div>
);

const TagCorrelationsSection = ({ tagStats, onExportCSV }: { tagStats: TagStats; onExportCSV: () => void }) => {
  if (!tagStats.topPositive.length && !tagStats.topNegative.length) return null;
  return (
    <div className="statistics-view__card statistics-view__section">
      <SectionHeader title="Tags Associated With Your Mood">
        <button type="button" className="statistics-view__ghost-button" onClick={onExportCSV}>Export CSV</button>
      </SectionHeader>
      <div className="statistics-view__tag-grid">
        <TagList heading="Often logged on better days" toneClass="statistics-view__tag-heading--positive" tags={tagStats.topPositive} emptyLabel="Keep logging — patterns like this take a few weeks to emerge" valueColor="var(--mood-4)" />
        <TagList heading="Often logged on harder days" toneClass="statistics-view__tag-heading--negative" tags={tagStats.topNegative} emptyLabel="Keep logging — patterns like this take a few weeks to emerge" valueColor="var(--mood-1)" />
      </div>
      <div className="statistics-view__tag-note">
        These are associations, not causes — a tag showing up alongside better or harder days doesn't mean it's the reason. The number shown is each day's overall (averaged) mood on days that tag was logged; "early signal" means there's only a little data so far, while "consistent pattern" reflects a tag seen often enough to take more seriously.
      </div>
    </div>
  );
};

const DigestRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="statistics-view__tag-item">
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

const WeeklyDigestSection = ({ digest }: { digest: WeeklyDigest }) => {
  const hasContent = digest.bestDay || digest.hardestDay || digest.topActivities.length > 0 || digest.trendComparison || digest.emergingPattern;
  if (!hasContent) return null;

  return (
    <div className="statistics-view__card statistics-view__section">
      <SectionHeader title="This Week, At a Glance" />
      <div className="statistics-view__tag-list">
        {digest.bestDay && (
          <DigestRow label="Best day" value={`${digest.bestDay.label} — ${MOOD_FULL_LABELS[digest.bestDay.mood] ?? ''}`} />
        )}
        {digest.hardestDay && (
          <DigestRow label="Hardest day" value={`${digest.hardestDay.label} — ${MOOD_FULL_LABELS[digest.hardestDay.mood] ?? ''}`} />
        )}
        {digest.topActivities.length > 0 && (
          <DigestRow
            label="Most-logged activities"
            value={digest.topActivities.map((a) => `${a.tag} (${a.count})`).join(', ')}
          />
        )}
        {digest.trendComparison && <DigestRow label="Compared to last week" value={digest.trendComparison} />}
        {digest.emergingPattern && (
          <DigestRow
            label="Worth noticing"
            value={`"${digest.emergingPattern.tag}" has often shown up on days averaging ${digest.emergingPattern.avgMood.toFixed(2)}`}
          />
        )}
      </div>
      <div className="statistics-view__tag-note">
        A quick recap, not a verdict — these are associations drawn from a single week and meant to spark noticing, not conclusions to act on.
      </div>
    </div>
  );
};

const MoodCalendarSection = ({ days }: { days: CalendarDay[] }) => (
  <div className="statistics-view__card statistics-view__calendar-card">
    <h3 className="statistics-view__calendar-title">Mood Calendar</h3>
    <div className="statistics-view__calendar-grid">
      {WEEK_DAYS.map((day) => <div key={day} className="statistics-view__calendar-label">{day}</div>)}
      {days.map(({ key, label, entry, IconComponent, iconColor, isCurrentMonth, isToday }) => (
        <div
          key={key}
          className={`statistics-view__calendar-day${entry ? ' has-entry' : ''}${isCurrentMonth ? '' : ' is-outside'}${isToday ? ' is-today' : ''}`}
          style={{ background: entry && iconColor ? `color-mix(in oklab, ${iconColor} 18%, transparent)` : undefined, color: entry && iconColor ? iconColor : undefined }}
        >
          {entry && IconComponent ? <IconComponent size={16} /> : label}
        </div>
      ))}
    </div>
  </div>
);

interface StatisticsViewProps {
  statistics: Statistics | null;
  pastEntries: Entry[];
  loading: boolean;
  error: string | null;
}

const StatisticsView = ({ statistics, pastEntries, loading, error }: StatisticsViewProps) => {
  const [range, setRange] = useState<number>(RANGE_OPTIONS[0]);
  const trendRef = useRef<HTMLDivElement>(null);
  const distributionRef = useRef<HTMLDivElement>(null);

  const { hasStatistics, weeklyMoodData, trendChartData, moodDistributionData, tagStats, calendarDays, overviewCards, weeklyDigest } =
    useStatisticsViewData(statistics, pastEntries, range);

  const handleExportTrendPNG = useCallback(() => {
    const svg = trendRef.current?.querySelector('svg');
    if (svg) exportSVGToPNG(svg, `mood-trend-${range}d.png`);
  }, [range]);

  const handleExportTrendCSV = useCallback(() => {
    exportDataToCSV(weeklyMoodData as unknown as Record<string, unknown>[], ['date', 'mood'], `mood-trend-${range}d.csv`);
  }, [weeklyMoodData, range]);

  const handleExportDistributionPNG = useCallback(() => {
    const svg = distributionRef.current?.querySelector('svg');
    if (svg) exportSVGToPNG(svg, 'mood-distribution.png');
  }, []);

  const handleExportDistributionCSV = useCallback(() => {
    const rows = moodDistributionData.map(({ label, count }) => ({ mood: label, count }));
    exportDataToCSV(rows, ['mood', 'count'], 'mood-distribution.csv');
  }, [moodDistributionData]);

  const handleExportTagCSV = useCallback(() => {
    exportDataToCSV(tagStats.all as unknown as Record<string, unknown>[], ['tag', 'count', 'avgMood'], 'tag-correlations.csv');
  }, [tagStats]);

  if (loading) return (
    <div className="statistics-view">
      <div className="statistics-view__overview-grid">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={120} radius={12} />)}
      </div>
      <Skeleton height={36} width={260} style={{ marginBottom: 12 }} />
      <Skeleton height={320} radius={16} />
    </div>
  );
  if (error) return <div className="statistics-view statistics-view__status statistics-view__status--error">{error}</div>;
  if (!hasStatistics) return <div className="statistics-view statistics-view__status">No statistics available</div>;

  return (
    <div className="statistics-view">
      <StatisticsOverviewGrid cards={overviewCards} />
      <MoodTrendSection chartData={trendChartData} range={range} onChangeRange={setRange} onExportPNG={handleExportTrendPNG} onExportCSV={handleExportTrendCSV} containerRef={trendRef} />
      <DistributionSection chartData={moodDistributionData} onExportPNG={handleExportDistributionPNG} onExportCSV={handleExportDistributionCSV} containerRef={distributionRef} />
      <WeeklyDigestSection digest={weeklyDigest} />
      <TagCorrelationsSection tagStats={tagStats} onExportCSV={handleExportTagCSV} />
      <MoodCalendarSection days={calendarDays} />
    </div>
  );
};

export default StatisticsView;
