import { relations } from 'drizzle-orm';
import { groups, groupOptions } from './groups';
import { moodEntries, entryMoodLogs, entrySelections, entrySliderValues } from './mood';
import { goals, goalCompletions } from './goals';
import { achievements } from './achievements';
import { fitnessConnections, fitnessData } from './fitness';
import { userPreferences } from './preferences';

export const groupsRelations = relations(groups, ({ many }) => ({
  options: many(groupOptions),
  sliderValues: many(entrySliderValues),
}));

export const groupOptionsRelations = relations(groupOptions, ({ one, many }) => ({
  group: one(groups, { fields: [groupOptions.groupId], references: [groups.id] }),
  selections: many(entrySelections),
}));

export const moodEntriesRelations = relations(moodEntries, ({ many }) => ({
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

export const goalsRelations = relations(goals, ({ many }) => ({
  completions: many(goalCompletions),
}));

export const goalCompletionsRelations = relations(goalCompletions, ({ one }) => ({
  goal: one(goals, { fields: [goalCompletions.goalId], references: [goals.id] }),
}));
