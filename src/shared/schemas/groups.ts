import { z } from 'zod';

export const groupTypeSchema = z.enum(['category', 'slider']);

export const groupCreateSchema = z.object({
  name: z.string().min(1),
  type: groupTypeSchema.optional(),
  slider_min: z.number().int().optional(),
  slider_max: z.number().int().optional(),
  slider_labels: z.array(z.string()).optional(),
});

export const groupUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  sort_order: z.number().int().optional(),
  type: groupTypeSchema.optional(),
  slider_min: z.number().int().optional(),
  slider_max: z.number().int().optional(),
  slider_labels: z.array(z.string()).nullable().optional(),
});

export const reorderRequestSchema = z.object({
  ordered_ids: z.array(z.number().int()),
});

export const optionCreateSchema = z.object({
  name: z.string().min(1),
});

export const optionUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  icon: z.string().optional(),
  sort_order: z.number().int().optional(),
});

export type GroupCreateInput = z.infer<typeof groupCreateSchema>;
export type GroupUpdateInput = z.infer<typeof groupUpdateSchema>;
export type ReorderRequestInput = z.infer<typeof reorderRequestSchema>;
export type OptionCreateInput = z.infer<typeof optionCreateSchema>;
export type OptionUpdateInput = z.infer<typeof optionUpdateSchema>;
