import { describe, expect, it } from 'vitest';
import { buildFormSchema } from '@/shared/components/form';
import { otherInformationField } from '../configs/fields';
import {
  mapLandAndBuildingFormDataToApiPayload,
  mapLandAndBuildingPropertyResponseToForm,
  mapLandPropertyResponseToForm,
} from './mappers';

/** "Has a building" is no longer asked, but a stored value must come back untouched on save. */
describe('hasBuilding (hidden)', () => {
  const saved = { hasBuilding: true, hasBuildingOther: 'shed on the plot' };

  it('loads into the form and goes back in the payload', () => {
    expect(mapLandPropertyResponseToForm({ ...saved } as never)).toMatchObject(saved);
    const form = mapLandAndBuildingPropertyResponseToForm({ ...saved } as never);
    expect(mapLandAndBuildingFormDataToApiPayload(form)).toMatchObject(saved);
  });

  it('never blocks a save: the other text is not required while hidden', () => {
    const schema = buildFormSchema(otherInformationField);
    const result = schema.safeParse({ hasBuilding: true, hasBuildingOther: '' });
    const paths = result.success ? [] : result.error.issues.map(i => i.path.join('.'));
    expect(paths).not.toContain('hasBuildingOther');
  });
});
