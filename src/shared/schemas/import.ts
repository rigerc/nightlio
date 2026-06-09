import { z } from 'zod';

const newGroupSchema = z.object({
  temp_id: z.string(),
  name: z.string().min(1),
  type: z.enum(['category', 'slider']),
  slider_min: z.number().int().optional(),
  slider_max: z.number().int().optional(),
});

const newOptionSchema = z.object({
  temp_id: z.string(),
  group_temp_id: z.string().optional(),
  group_id: z.number().int().optional(),
  name: z.string().min(1),
});

const importEntrySchema = z.object({
  date: z.string().min(1),
  time: z.string().optional(),
  mood: z.number().int().min(1).max(5),
  content: z.string(),
  option_ids: z.array(z.number().int()).default([]),
  option_temp_ids: z.array(z.string()).default([]),
  slider_values: z.record(z.coerce.number().int(), z.number().int()).default({}),
  slider_temp_values: z.record(z.string(), z.number().int()).default({}),
});

export const daylioImportSchema = z.object({
  new_groups: z.array(newGroupSchema).default([]),
  new_options: z.array(newOptionSchema).default([]),
  entries: z.array(importEntrySchema),
});

export type DaylioImportPayload = z.infer<typeof daylioImportSchema>;
