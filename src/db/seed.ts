import { db } from './client';
import { groups, groupOptions } from './schema';

const DEFAULT_GROUPS = [
  {
    name: 'Emotions', color: '#ec4899', icon: 'Heart', sortOrder: 0, type: 'category' as const,
    options: [
      { name: 'happy', icon: 'Smile', sortOrder: 0 },
      { name: 'excited', icon: 'Sparkles', sortOrder: 1 },
      { name: 'grateful', icon: 'Heart', sortOrder: 2 },
      { name: 'content', icon: 'Smile', sortOrder: 3 },
      { name: 'calm', icon: 'Leaf', sortOrder: 4 },
      { name: 'hopeful', icon: 'Sun', sortOrder: 5 },
      { name: 'proud', icon: 'Trophy', sortOrder: 6 },
      { name: 'loved', icon: 'Heart', sortOrder: 7 },
      { name: 'unsure', icon: 'Meh', sortOrder: 8 },
      { name: 'bored', icon: 'Meh', sortOrder: 9 },
      { name: 'lonely', icon: 'CloudRain', sortOrder: 10 },
      { name: 'anxious', icon: 'Wind', sortOrder: 11 },
      { name: 'irritated', icon: 'ZapOff', sortOrder: 12 },
      { name: 'angry', icon: 'Flame', sortOrder: 13 },
      { name: 'stressed', icon: 'ZapOff', sortOrder: 14 },
      { name: 'sad', icon: 'Frown', sortOrder: 15 },
    ],
  },
  {
    name: 'Sleep', color: '#6366f1', icon: 'Moon', sortOrder: 1, type: 'category' as const,
    options: [
      { name: 'Slept well', icon: 'Moon', sortOrder: 0 },
      { name: 'Poor sleep', icon: 'CloudRain', sortOrder: 1 },
      { name: 'Nap', icon: 'Cloud', sortOrder: 2 },
      { name: 'Overslept', icon: 'AlarmClock', sortOrder: 3 },
      { name: 'Interrupted sleep', icon: 'Wind', sortOrder: 4 },
      { name: 'Early wake-up', icon: 'Sunrise', sortOrder: 5 },
    ],
  },
  {
    name: 'Physical Activity', color: '#84cc16', icon: 'Dumbbell', sortOrder: 2, type: 'category' as const,
    options: [
      { name: 'Walking', icon: 'Footprints', sortOrder: 0 },
      { name: 'Running', icon: 'PersonStanding', sortOrder: 1 },
      { name: 'Cycling', icon: 'Bike', sortOrder: 2 },
      { name: 'Gym', icon: 'Dumbbell', sortOrder: 3 },
      { name: 'Team sport', icon: 'Trophy', sortOrder: 4 },
      { name: 'Yoga', icon: 'Leaf', sortOrder: 5 },
      { name: 'Stretching', icon: 'MoveHorizontal', sortOrder: 6 },
      { name: 'Outdoor activity', icon: 'TreePine', sortOrder: 7 },
      { name: 'Physical labor', icon: 'Hammer', sortOrder: 8 },
    ],
  },
  {
    name: 'Social', color: '#3b82f6', icon: 'Users', sortOrder: 3, type: 'category' as const,
    options: [
      { name: 'Time with partner', icon: 'Heart', sortOrder: 0 },
      { name: 'Family time', icon: 'Home', sortOrder: 1 },
      { name: 'Friends', icon: 'Users', sortOrder: 2 },
      { name: 'Group activity', icon: 'UserPlus', sortOrder: 3 },
      { name: 'Meaningful conversation', icon: 'MessageCircle', sortOrder: 4 },
      { name: 'Casual socializing', icon: 'Coffee', sortOrder: 5 },
    ],
  },
  {
    name: 'Work & Study', color: '#f59e0b', icon: 'Briefcase', sortOrder: 4, type: 'category' as const,
    options: [
      { name: 'Deep work', icon: 'Target', sortOrder: 0 },
      { name: 'Meetings', icon: 'Users', sortOrder: 1 },
      { name: 'Learning', icon: 'GraduationCap', sortOrder: 2 },
      { name: 'Deadline pressure', icon: 'Clock', sortOrder: 3 },
      { name: 'Overtime', icon: 'Timer', sortOrder: 4 },
    ],
  },
  {
    name: 'Self-Care', color: '#10b981', icon: 'Leaf', sortOrder: 5, type: 'category' as const,
    options: [
      { name: 'Meditation', icon: 'Brain', sortOrder: 0 },
      { name: 'Journaling', icon: 'Notebook', sortOrder: 1 },
      { name: 'Therapy', icon: 'MessageCircle', sortOrder: 2 },
      { name: 'Mindfulness', icon: 'Leaf', sortOrder: 3 },
      { name: 'Medical appointment', icon: 'Stethoscope', sortOrder: 4 },
      { name: 'Medication taken', icon: 'Pill', sortOrder: 5 },
    ],
  },
  {
    name: 'Leisure & Entertainment', color: '#06b6d4', icon: 'Tv', sortOrder: 6, type: 'category' as const,
    options: [
      { name: 'Watching TV', icon: 'Tv', sortOrder: 0 },
      { name: 'Gaming', icon: 'Gamepad2', sortOrder: 1 },
      { name: 'Reading', icon: 'BookOpen', sortOrder: 2 },
      { name: 'Music', icon: 'Music', sortOrder: 3 },
      { name: 'Relaxing', icon: 'Sofa', sortOrder: 4 },
    ],
  },
  {
    name: 'Sleep Quality', color: '#6366f1', icon: 'Moon', sortOrder: 7,
    type: 'slider' as const, sliderMin: 1, sliderMax: 5,
    sliderLabels: ['Terrible', 'Poor', 'Okay', 'Good', 'Great'],
    options: [],
  },
  {
    name: 'Positivity', color: '#eab308', icon: 'Sparkles', sortOrder: 8,
    type: 'slider' as const, sliderMin: 1, sliderMax: 5,
    sliderLabels: ['Very low', 'Low', 'Neutral', 'High', 'Very high'],
    options: [],
  },
  {
    name: 'Overwhelm', color: '#ef4444', icon: 'Zap', sortOrder: 9,
    type: 'slider' as const, sliderMin: 1, sliderMax: 5,
    sliderLabels: ['Minimal', 'Mild', 'Moderate', 'High', 'Overwhelming'],
    options: [],
  },
];

export async function seedDefaultGroups(): Promise<void> {
  const existing = await db.select({ id: groups.id }).from(groups).limit(1);
  if (existing.length > 0) return;

  for (const group of DEFAULT_GROUPS) {
    const [inserted] = await db
      .insert(groups)
      .values({
        name: group.name,
        color: group.color,
        icon: group.icon,
        sortOrder: group.sortOrder,
        type: group.type,
        sliderMin: (group as { sliderMin?: number }).sliderMin,
        sliderMax: (group as { sliderMax?: number }).sliderMax,
        sliderLabels: (group as { sliderLabels?: string[] }).sliderLabels ?? null,
      })
      .returning({ id: groups.id });

    if (group.options.length > 0) {
      await db.insert(groupOptions).values(
        group.options.map((opt) => ({
          groupId: inserted.id,
          name: opt.name,
          icon: opt.icon,
          sortOrder: opt.sortOrder,
        }))
      );
    }
  }
}
