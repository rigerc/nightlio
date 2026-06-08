import { z } from 'zod';

export const moodValueSchema = z.number().int().min(1).max(5);

export const moodCreateSchema = z.object({
  mood: moodValueSchema,
  date: z.string().min(1),
  content: z.string(),
  time: z.string().optional(),
  selected_options: z.array(z.number().int()).default([]),
  slider_values: z.record(z.coerce.number().int(), z.number().int()).default({}),
  is_important: z.boolean().optional(),
  important_reason: z.string().optional(),
});

export const moodUpdateSchema = z.object({
  mood: moodValueSchema.optional(),
  date: z.string().min(1).optional(),
  content: z.string().optional(),
  time: z.string().optional(),
  selected_options: z.array(z.number().int()).optional(),
  slider_values: z.record(z.coerce.number().int(), z.number().int()).optional(),
  is_important: z.boolean().optional(),
  important_reason: z.string().optional(),
});

export const moodLogCreateSchema = z.object({
  mood: moodValueSchema,
});

export type MoodCreateInput = z.infer<typeof moodCreateSchema>;
export type MoodUpdateInput = z.infer<typeof moodUpdateSchema>;
export type MoodLogCreateInput = z.infer<typeof moodLogCreateSchema>;
