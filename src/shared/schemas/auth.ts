import { z } from 'zod';

export const googleAuthRequestSchema = z.object({
  token: z.string().min(1),
});

export type GoogleAuthInput = z.infer<typeof googleAuthRequestSchema>;
