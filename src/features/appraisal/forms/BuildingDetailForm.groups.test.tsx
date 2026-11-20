import { describe, expect, it } from 'vitest';
import '@/i18n';
import { FormProvider, useForm } from 'react-hook-form';
import { render, screen } from '@/test/test-utils';
import { createBuildingFormDefault } from '../schemas/form';
import { PropertyNameInHeaderContext } from '../components/propertyNameInHeader';
import BuildingDetailForm from './BuildingDetailForm';

/** The building form's groups, in the order the report prints them (the approved regrouping). */

/** The `auto | 1fr` row a toggle and its field share (see togglePairs), or null. */
const pairRow = (f: string) =>
  document
    .querySelector<HTMLElement>(`[data-field="${f}"]`)
    ?.parentElement?.className.includes('grid-cols-[auto_minmax(0,1fr)]')
    ? document.querySelector<HTMLElement>(`[data-field="${f}"]`)!.parentElement
    : null;

const Harness = ({ nameInHeader }: { nameInHeader: boolean }) => {
  const methods = useForm<Record<string, unknown>>({
    // Encroaching on others opens its area and remark, so they can be found.
    defaultValues: { ...createBuildingFormDefault, isEncroachingOthers: true },
  });
  return (
    <PropertyNameInHeaderContext.Provider value={nameInHeader}>
      <FormProvider {...methods}>
        <BuildingDetailForm />
      </FormProvider>
    </PropertyNameInHeaderContext.Provider>
  );
};

const groups = () => screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);
const groupOf = (field: string) =>
  document.querySelector(`[data-field="${field}"]`)?.closest('section')?.querySelector('h3')
    ?.textContent;
const before = (a: string, b: string) => {
  const first = document.querySelector(`[data-field="${a}"]`);
  const second = document.querySelector(`[data-field="${b}"]`);
  if (!first || !second) return false;
  return (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
};

describe('building form groups', () => {
  it('runs identification, ownership, type, condition, structure, finishes, floors, value, limitations, remark', () => {
    render(<Harness nameInHeader />);
    expect(groups()).toEqual([
      'Identification',
      'Ownership & Obligations',
      'Type, Size & Use',
      'Condition & Quality',
      'Structure, Roof & Ceiling',
      'Walls, Doors, Windows & Systems',
      'Floors',
      'Building Value',
      'Limitations',
      'Property List Remark',
    ]);
  });

  it('puts each moved field in its new group', () => {
    render(<Harness nameInHeader />);
    expect(groupOf('houseNumber')).toBe('Identification');
    expect(groupOf('builtOnTitleNumber')).toBe('Identification');
    // Whether the building is valued sits with its area and cost, not with its identity.
    expect(groupOf('isAppraisable')).toBe('Building Value');
    for (const f of ['isEncroachingOthers', 'encroachingOthersArea', 'encroachingOthersRemark'])
      // The encroachment has a section of its own, near the end, not with the ownership.
      expect(groupOf(f)).toBe('Limitations');
    for (const f of ['numberOfFloors', 'buildingWidth', 'totalBuildingArea', 'spaceDivision'])
      expect(groupOf(f)).toBe('Type, Size & Use');
    expect(groupOf('buildingAge')).toBe('Condition & Quality');
    expect(groupOf('ceilingType')).toBe('Structure, Roof & Ceiling');
    expect(groupOf('fenceType')).toBe('Walls, Doors, Windows & Systems');
  });

  it('keeps the order inside the groups', () => {
    render(<Harness nameInHeader />);
    expect(before('buildingType', 'numberOfFloors')).toBe(true);
    // The floors, the usable area and then the size make one row (3 + 4 + 5).
    expect(before('numberOfFloors', 'totalBuildingArea')).toBe(true);
    expect(before('totalBuildingArea', 'buildingWidth')).toBe(true);
    expect(before('buildingWidth', 'spaceDivision')).toBe(true);
    expect(before('spaceDivision', 'constructionType')).toBe(true);
    expect(before('buildingAge', 'buildingConditionType')).toBe(true);
    expect(before('roofType', 'ceilingType')).toBe(true);
    expect(before('isEncroachingOthers', 'encroachingOthersRemark')).toBe(true);
    // The limitations follow the building value and come before the remark.
    expect(before('isAppraisable', 'isEncroachingOthers')).toBe(true);
    expect(before('encroachingOthersRemark', 'remark')).toBe(true);
  });

  it('lays the identification out as number + model, then the house number + chips, then the title deed, with the name on its own row', () => {
    render(<Harness nameInHeader={false} />);
    const span = (f: string) =>
      document
        .querySelector<HTMLElement>(`[data-field="${f}"]`)
        ?.className.match(/col-span-\d+/)?.[0];
    expect(span('propertyName')).toBe('col-span-12');
    // The building number and the model are two halves, and so are the house number and its chips.
    for (const f of ['buildingNumber', 'modelName', 'houseNumber', 'houseNumberStatus'])
      expect(span(f)).toBe('col-span-6');
    expect(before('buildingNumber', 'modelName')).toBe(true);
    expect(before('modelName', 'houseNumber')).toBe(true);
    expect(before('houseNumber', 'houseNumberStatus')).toBe(true);
    // The title deed is alone on the last row, full width.
    expect(before('houseNumberStatus', 'builtOnTitleNumber')).toBe(true);
    expect(span('builtOnTitleNumber')).toBe('col-span-12');
  });

  it('follows the field-size standard', () => {
    render(<Harness nameInHeader />);
    const span = (f: string) =>
      document
        .querySelector<HTMLElement>(`[data-field="${f}"]`)
        ?.className.match(/col-span-\d+/)?.[0];
    const spans: Record<string, string> = {
      isAppraisable: 'col-span-4',
      numberOfFloors: 'col-span-3',
      buildingWidth: 'col-span-5',
      totalBuildingArea: 'col-span-4',
      constructionType: 'col-span-12',
      utilizationType: 'col-span-12',
      buildingAge: 'col-span-3',
      constructionLicenseNumber: 'col-span-8',
      constructionLicenseExpirationDate: 'col-span-4',
      isUnderConstruction: 'col-span-12',
      buildingMaterialType: 'col-span-12',
      buildingStyleType: 'col-span-12',
    };
    for (const [f, want] of Object.entries(spans)) expect([f, span(f)]).toEqual([f, want]);
    expect(pairRow('isOwnerVerifiedBuilding')).not.toBeNull();
    expect(pairRow('isOwnerVerifiedBuilding')).toBe(pairRow('ownerNameBuilding'));
    expect(span('isOwnerVerifiedBuilding')).toBeUndefined();
    // The condition row comes before the condition chips.
    expect(before('isUnderConstruction', 'buildingConditionType')).toBe(true);
  });

  it('keeps the building age a quarter of the row, with the condition chips on a row of their own', () => {
    render(<Harness nameInHeader />);
    const span = (f: string) =>
      document
        .querySelector<HTMLElement>(`[data-field="${f}"]`)
        ?.className.match(/col-span-\d+/)?.[0];
    expect(span('buildingAge')).toBe('col-span-3');
    expect(span('buildingConditionType')).toBe('col-span-12');
  });

  it('draws the name in the identification group only when the header does not', () => {
    const { unmount } = render(<Harness nameInHeader />);
    expect(document.querySelector('[data-field="propertyName"]')).toBeNull();
    unmount();
    render(<Harness nameInHeader={false} />);
    expect(groupOf('propertyName')).toBe('Identification');
  });

  it('puts the encroachment area beside its toggle at a number-field width, the remark on the row below', () => {
    render(<Harness nameInHeader />);
    const toggle = document.querySelector('[data-field="isEncroachingOthers"]')!;
    const area = document.querySelector('[data-field="encroachingOthersArea"]')!;
    expect(toggle.parentElement).toBe(area.parentElement);
    expect(toggle.parentElement).toHaveClass('flex', 'flex-wrap');
    expect(area).toHaveClass(
      'w-[calc(25%-0.8571rem)]',
      'min-w-[11rem]',
      '@max-[64rem]/form-shell:w-full',
    );
    // The remark is an ordinary full-width row under them, not part of the toggle row.
    const remark = document.querySelector('[data-field="encroachingOthersRemark"]')!;
    expect(remark.parentElement).not.toBe(toggle.parentElement);
    expect(remark).toHaveClass('col-span-12');
    expect(before('encroachingOthersArea', 'encroachingOthersRemark')).toBe(true);
  });

  it('hides the encroachment area (and the remark) on No, inside the toggle row too', async () => {
    const { user } = render(<Harness nameInHeader />);
    expect(document.querySelector('[data-field="encroachingOthersArea"]')).not.toBeNull();
    const no = [
      ...document.querySelectorAll<HTMLElement>('[data-field="isEncroachingOthers"] [role=radio]'),
    ].find(r => r.textContent !== 'Yes' && r.textContent !== 'ใช่')!;
    await user.click(no);
    expect(document.querySelector('[data-field="encroachingOthersArea"]')).toBeNull();
    expect(document.querySelector('[data-field="encroachingOthersRemark"]')).toBeNull();
  });

  it('closes the area and cost section with the valuation toggle, under its table, at its own width', () => {
    render(<Harness nameInHeader />);
    const toggle = document.querySelector('[data-field="isAppraisable"]')!;
    const section = toggle.closest('section')!;
    expect(toggle).toHaveClass('col-span-4');
    // The last field of the section, and after the area and cost table (and its summary) before it.
    const fields = [...section.querySelectorAll('[data-field]')];
    expect(fields[fields.length - 1]).toBe(toggle);
    expect(before('depreciationDetails', 'isAppraisable')).toBe(true);
    // And it is gone from the identification row.
    const identity = document
      .querySelector('[data-field="builtOnTitleNumber"]')!
      .closest('section')!;
    expect(identity.querySelector('[data-field="isAppraisable"]')).toBeNull();
  });

  it('puts the licence number and its expiry date in ownership after the owner, and the construction toggle and age first in the condition', () => {
    render(<Harness nameInHeader />);
    for (const f of ['constructionLicenseNumber', 'constructionLicenseExpirationDate'])
      expect(groupOf(f)).toBe('Ownership & Obligations');
    // After the owner row, before the obligation chips; the number and its expiry date are a row (8 + 4).
    expect(before('ownerNameBuilding', 'constructionLicenseNumber')).toBe(true);
    expect(before('constructionLicenseNumber', 'constructionLicenseExpirationDate')).toBe(true);
    expect(before('constructionLicenseExpirationDate', 'obligationType')).toBe(true);
    expect(document.querySelector('[data-field="constructionLicenseNumber"]')).toHaveClass(
      'col-span-8',
    );
    // The condition group opens with the toggle, then the age, then the condition chips.
    expect(groupOf('isUnderConstruction')).toBe('Condition & Quality');
    expect(before('isUnderConstruction', 'buildingAge')).toBe(true);
    expect(before('buildingAge', 'buildingConditionType')).toBe(true);
    const conditionSection = document
      .querySelector('[data-field="buildingAge"]')!
      .closest('section')!;
    expect(conditionSection.querySelector('[data-field="constructionLicenseNumber"]')).toBeNull();
    // Both start a row of their own: the toggle is a full-row cell, so the age cannot join it.
    expect(document.querySelector('[data-field="isUnderConstruction"]')).toHaveClass('col-span-12');
    expect(document.querySelector('[data-field="buildingAge"]')).toHaveClass('col-span-3');
  });
});
