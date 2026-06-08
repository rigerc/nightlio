import { relations } from 'drizzle-orm';
import { users } from './users';
import { groups, groupOptions } from './groups';
import { moodEntries, entryMoodLogs, entrySelections, entrySliderValues } from './mood';
import { goals, goalCompletions } from './goals';
import { userPreferences, userMetrics } from './preferences';
import { achievements } from './achievements';
import { fitnessConnections, fitnessData } from './fitness';

export const usersRelations = relations(users, ({ many, one }) => ({
  moodEntries: many(moodEntries),
  goals: many(goals),
  achievements: many(achievements),
  preferences: one(userPreferences, {
    fields: [users.id],
    references: [userPreferences.userId],
  }),
}));

export const groupsRelations = relations(groups, ({ many }) => ({
  options: many(groupOptions),
  sliderValues: many(entrySliderValues),
}));

export const groupOptionsRelations = relations(groupOptions, ({ one, many }) => ({
  group: one(groups, { fields: [groupOptions.groupId], references: [groups.id] }),
  selections: many(entrySelections),
}));

export const moodEntriesRelations = relations(moodEntries, ({ one, many }) => ({
  user: one(users, { fields: [moodEntries.userId], references: [users.id] }),
  logs: many(entryMoodLogs),
  selections: many(entrySelections),
  sliderValues: many(entrySliderValues),
}));

export const entryMoodLogsRelations = relations(entryMoodLogs, ({ one }) => ({
  entry: one(moodEntries, { fields: [entryMoodLogs.entryId], references: [moodEntries.id] }),
}));

export const entrySelectionsRelations = relations(entrySelections, ({ one }) => ({
  entry: one(moodEntries, { fields: [entrySelections.entryId], references: [moodEntries.id] }),
  option: one(groupOptions, { fields: [entrySelections.optionId], references: [groupOptions.id] }),
}));

export const entrySliderValuesRelations = relations(entrySliderValues, ({ one }) => ({
  entry: one(moodEntries, { fields: [entrySliderValues.entryId], references: [moodEntries.id] }),
  group: one(groups, { fields: [entrySliderValues.groupId], references: [groups.id] }),
}));

export const goalsRelations = relations(goals, ({ one, many }) => ({
  user: one(users, { fields: [goals.userId], references: [users.id] }),
  completions: many(goalCompletions),
}));

export const goalCompletionsRelations = relations(goalCompletions, ({ one }) => ({
  goal: one(goals, { fields: [goalCompletions.goalId], references: [goals.id] }),
  user: one(users, { fields: [goalCompletions.userId], references: [users.id] }),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, { fields: [userPreferences.userId], references: [users.id] }),
}));

export const userMetricsRelations = relations(userMetrics, ({ one }) => ({
  user: one(users, { fields: [userMetrics.userId], references: [users.id] }),
}));

export const achievementsRelations = relations(achievements, ({ one }) => ({
  user: one(users, { fields: [achievements.userId], references: [users.id] }),
}));

export const fitnessConnectionsRelations = relations(fitnessConnections, ({ one }) => ({
  user: one(users, { fields: [fitnessConnections.userId], references: [users.id] }),
}));

export const fitnessDataRelations = relations(fitnessData, ({ one }) => ({
  user: one(users, { fields: [fitnessData.userId], references: [users.id] }),
}));
