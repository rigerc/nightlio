import { z } from 'zod';

export const goalCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(''),
  frequency_per_week: z.number().int().min(1).max(7),
});

export const goalUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  frequency_per_week: z.number().int().min(1).max(7).optional(),
  frequency: z.number().int().min(1).max(7).optional(),
});

export type GoalCreateInput = z.infer<typeof goalCreateSchema>;
export type GoalUpdateInput = z.infer<typeof goalUpdateSchema>;
