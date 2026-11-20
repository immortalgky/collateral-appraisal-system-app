import { describe, expect, it } from 'vitest';
import '@/i18n';
import { FormProvider, useForm } from 'react-hook-form';
import { render } from '@/test/test-utils';
import { createLandFormDefault } from '@/features/appraisal/schemas/form';
import BlockLandDetailForm from './BlockLandDetailForm';

/** A block-project land has no rented-out field, and "has a building" is not asked any more. */
const Harness = () => {
  const methods = useForm<Record<string, unknown>>({ defaultValues: { ...createLandFormDefault } });
  return (
    <FormProvider {...methods}>
      <BlockLandDetailForm />
    </FormProvider>
  );
};

describe('block-project land form', () => {
  it('shows neither the rented-out switch nor the has-building fields, but still its other fields', () => {
    render(<Harness />);
    for (const name of ['isRentedOut', 'hasBuilding', 'hasBuildingOther']) {
      expect(document.querySelector(`[data-field="${name}"]`)).toBeNull();
    }
    expect(document.querySelector('[data-field="pondArea"]')).not.toBeNull();
  });

  it('asks for the surroundings right after the land zone', () => {
    render(<Harness />);
    const zone = document.querySelector('[data-field="landZoneType"]')!;
    const env = document.querySelector('[data-field="environmentType"]')!;
    expect(env).not.toBeNull();
    expect(zone.compareDocumentPosition(env) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(zone.closest('section')).toBe(env.closest('section'));
  });

  it('asks why the position is incorrect, under that check, and the check-by is a chip list', () => {
    render(<Harness />);
    const verdict = document.querySelector('[data-field="isLandLocationVerified"]')!;
    const remark = document.querySelector('[data-field="landLocationRemark"]')!;
    expect(remark).not.toBeNull();
    expect(verdict.compareDocumentPosition(remark) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(document.querySelector('[data-field="landCheckMethodType"] [role=radio]')).toBeNull();
  });

  it('does not ask the expropriation map sheet, only the expropriation line', () => {
    render(<Harness />);
    expect(document.querySelector('[data-field="isExpropriated"]')).toBeNull();
    expect(document.querySelector('[data-field="expropriationRemark"]')).toBeNull();
    expect(document.querySelector('[data-field="isInExpropriationLine"]')).not.toBeNull();
  });

  it('still asks the decree and the remarks of the lines, and the landlocked plot', () => {
    render(<Harness />);
    for (const name of ['isLandlocked', 'isInExpropriationLine', 'isForestBoundary'])
      expect(document.querySelector(`[data-field="${name}"]`)).not.toBeNull();
  });
});
