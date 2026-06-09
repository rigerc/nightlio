import { z } from 'zod';

export const storeTokensRequestSchema = z.object({
  provider: z.string().min(1),
  access_token: z.string().min(1),
  refresh_token: z.string().nullish(),
  expires_in: z.number().int().nullish(),
});

export type StoreTokensInput = z.infer<typeof storeTokensRequestSchema>;
