import { describe, expect, it } from 'vitest';
import { moodCreateSchema, moodLogCreateSchema, moodUpdateSchema } from './mood';

describe('Hono mood request schemas', () => {
  it('defaults optional selection and slider request fields on create', () => {
    const parsed = moodCreateSchema.parse({
      mood: 4,
      date: '2026-06-08',
      content: 'A good day',
    });

    expect(parsed).toEqual({
      mood: 4,
      date: '2026-06-08',
      content: 'A good day',
      selected_options: [],
      slider_values: {},
    });
  });

  it('accepts partial entry updates and coerces slider value keys to numbers', () => {
    const parsed = moodUpdateSchema.parse({
      selected_options: [1, 2],
      slider_values: { '10': 3 },
    });

    expect(parsed).toEqual({
      selected_options: [1, 2],
      slider_values: { 10: 3 },
    });
  });

  it('rejects out-of-range mood values', () => {
    expect(() => moodCreateSchema.parse({ mood: 6, date: '2026-06-08', content: 'Nope' })).toThrow();
    expect(() => moodLogCreateSchema.parse({ mood: 0 })).toThrow();
  });
});
