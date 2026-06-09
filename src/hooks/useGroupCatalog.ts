import { useGroups } from './useGroups';
import type { UseGroupsReturn } from './useGroups';

export interface SliderValidationResult {
  valid: boolean;
  error: string | null;
}

export interface UseGroupCatalogReturn extends UseGroupsReturn {
  validateSlider(fields: { slider_min: number; slider_max: number; slider_labels?: string[] | null }): SliderValidationResult;
}

export function useGroupCatalog(): UseGroupCatalogReturn {
  const groups = useGroups();

  function validateSlider(fields: { slider_min: number; slider_max: number; slider_labels?: string[] | null }): SliderValidationResult {
    const { slider_min, slider_max, slider_labels } = fields;
    if (!Number.isFinite(slider_min) || !Number.isFinite(slider_max)) {
      return { valid: false, error: 'Slider min and max must be numbers' };
    }
    if (slider_min >= slider_max) {
      return { valid: false, error: 'slider_max must be greater than slider_min' };
    }
    const expectedLength = slider_max - slider_min + 1;
    if (slider_labels && slider_labels.length !== expectedLength) {
      return { valid: false, error: `Label count must equal slider_max − slider_min + 1 (${expectedLength})` };
    }
    return { valid: true, error: null };
  }

  return { ...groups, validateSlider };
}
