import { describe, expect, it } from 'vitest';
import '@/i18n';
import { FormProvider, useForm } from 'react-hook-form';
import { render, screen } from '@/test/test-utils';
import { createCondoFormDefault } from '../schemas/form';
import { PropertyNameInHeaderContext } from '../components/propertyNameInHeader';
import CondoDetailForm from './CondoDetailForm';

/** The condo form's groups, in the order the report prints them (the approved regrouping). */

/** The `auto | 1fr` row a toggle and its field share (see togglePairs), or null. */
const pairRow = (f: string) =>
  document
    .querySelector<HTMLElement>(`[data-field="${f}"]`)
    ?.parentElement?.className.includes('grid-cols-[auto_minmax(0,1fr)]')
    ? document.querySelector<HTMLElement>(`[data-field="${f}"]`)!.parentElement
    : null;

const Harness = ({
  nameInHeader,
  hideRentedOut = false,
}: {
  nameInHeader: boolean;
  hideRentedOut?: boolean;
}) => {
  const methods = useForm<Record<string, unknown>>({
    defaultValues: { ...createCondoFormDefault },
  });
  return (
    <PropertyNameInHeaderContext.Provider value={nameInHeader}>
      <FormProvider {...methods}>
        <CondoDetailForm hideRentedOut={hideRentedOut} />
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

const span = (f: string) =>
  document.querySelector<HTMLElement>(`[data-field="${f}"]`)?.className.match(/col-span-\d+/)?.[0];

const LOCATION = 'Location';
const AREA = 'Area, Zoning & Use';
const ACCESS = 'Access & Road';
const UTILITIES = 'Utilities';

describe('condo form groups', () => {
  it('runs the eleven groups in order', () => {
    render(<Harness nameInHeader />);
    expect(groups()).toEqual([
      'Identification',
      'Ownership & Obligations',
      LOCATION,
      AREA,
      ACCESS,
      UTILITIES,
      'Condominium Building',
      'Unit',
      'Limitations & Legal',
      'Government Appraisal Price and Insured Value',
      'Property List Remark',
    ]);
  });

  it('puts each field in its group', () => {
    render(<Harness nameInHeader />);
    for (const f of ['street', 'soi', 'distanceFromMainRoad', 'latitude', 'locationType'])
      expect(groupOf(f)).toBe(LOCATION);
    for (const f of ['urbanPlanningType', 'landFillType', 'landUseType', 'environmentType'])
      expect(groupOf(f)).toBe(AREA);
    expect(groupOf('environmentProblems')).toBe(AREA);
    for (const f of [
      'landEntranceExitType',
      'carriagewayWidth',
      'rightOfWayWidth',
      'numberOfLanes',
      'roadSurfaceType',
    ])
      expect(groupOf(f)).toBe(ACCESS);
    expect(groupOf('publicUtilityType')).toBe(UTILITIES);
    expect(groupOf('limitationFlags')).toBe('Limitations & Legal');
  });

  it('keeps the order inside the groups', () => {
    render(<Harness nameInHeader />);
    // The position check closes the location, after the street, soi and distance.
    expect(before('distanceFromMainRoad', 'locationType')).toBe(true);
    expect(before('urbanPlanningType', 'landFillType')).toBe(true);
    expect(before('environmentType', 'environmentProblems')).toBe(true);
    // Access first, then the road.
    expect(before('landEntranceExitType', 'carriagewayWidth')).toBe(true);
    expect(before('numberOfLanes', 'roadSurfaceType')).toBe(true);
  });

  it('lays the identification out as the names on a row each, then four numbers and the model + area', () => {
    render(<Harness nameInHeader={false} />);
    expect(span('propertyName')).toBe('col-span-12');
    expect(span('condoName')).toBe('col-span-12');
    for (const f of ['roomNumber', 'floorNumber', 'buildingNumber', 'condoRegistrationNumber'])
      expect(span(f)).toBe('col-span-3');
    expect(span('modelName')).toBe('col-span-6');
    expect(span('usableArea')).toBe('col-span-6');
    expect(before('condoName', 'roomNumber')).toBe(true);
    expect(before('usableArea', 'titleNumber')).toBe(true);
  });

  it('follows the field-size standard in the other groups', () => {
    render(<Harness nameInHeader />);
    const spans: Record<string, string> = {
      documentValidationResultType: 'col-span-12',
      isRentedOut: 'col-span-12',
      street: 'col-span-6',
      soi: 'col-span-3',
      distanceFromMainRoad: 'col-span-3',
      carriagewayWidth: 'col-span-4',
      rightOfWayWidth: 'col-span-4',
      numberOfLanes: 'col-span-4',
      isUnderConstruction: 'col-span-12',
      buildingAge: 'col-span-12',
      numberOfFloors: 'col-span-12',
      buildingFormType: 'col-span-12',
      constructionMaterialType: 'col-span-12',
      isMissingFromSurvey: 'col-span-12',
      governmentPricePerSqm: 'col-span-6',
      governmentPrice: 'col-span-6',
      fireInsuranceCode: 'col-span-12',
      buildingInsurancePrice: 'col-span-6',
      buildingInsurancePriceOverride: 'col-span-6',
    };
    for (const [f, want] of Object.entries(spans)) expect([f, span(f)]).toEqual([f, want]);
    expect(pairRow('isOwnerVerified')).not.toBeNull();
    expect(pairRow('isOwnerVerified')).toBe(pairRow('ownerName'));
    expect(span('isOwnerVerified')).toBeUndefined();
  });

  it('draws the name in the identification group only when the header does not', () => {
    const { unmount } = render(<Harness nameInHeader />);
    expect(document.querySelector('[data-field="propertyName"]')).toBeNull();
    unmount();
    render(<Harness nameInHeader={false} />);
    expect(groupOf('propertyName')).toBe('Identification');
  });

  it('draws the limitation chips (line, forest, others) and no decree or remark for them', async () => {
    const { user } = render(<Harness nameInHeader />);
    const chips = [...document.querySelectorAll('[data-field="limitationFlags"] button')].map(b =>
      b.textContent?.trim(),
    );
    expect(chips).toEqual(['In Line Expropriated', 'Is In Forest Boundary', 'Others']);
    await user.click(screen.getByRole('button', { name: 'In Line Expropriated' }));
    await user.click(screen.getByRole('button', { name: 'Is In Forest Boundary' }));
    // Their detail is in the Law & Regulation tab: nothing to type here.
    for (const f of ['royalDecree', 'expropriationLineRemark', 'forestBoundaryRemark'])
      expect(document.querySelector(`[data-field="${f}"]`)).toBeNull();
  });

  it('puts the document check before rented out, each on a row of its own after the obligations', () => {
    render(<Harness nameInHeader />);
    const check = document.querySelector('[data-field="documentValidationResultType"]')!;
    const rented = document.querySelector('[data-field="isRentedOut"]')!;
    expect(before('obligationType', 'documentValidationResultType')).toBe(true);
    expect(before('documentValidationResultType', 'isRentedOut')).toBe(true);
    // Full-row cells: neither shares a row, and each toggle keeps its own width.
    expect(check).toHaveClass('col-span-12');
    expect(rented).toHaveClass('col-span-12');
  });

  it('still drops rented out by name when it is hidden, and keeps the document check', () => {
    render(<Harness nameInHeader hideRentedOut />);
    expect(document.querySelector('[data-field="isRentedOut"]')).toBeNull();
    expect(document.querySelector('[data-field="documentValidationResultType"]')).not.toBeNull();
  });

  it('opens the building group with the construction toggle, then the age and the floors', () => {
    render(<Harness nameInHeader />);
    expect(before('isUnderConstruction', 'buildingAge')).toBe(true);
    expect(before('buildingAge', 'numberOfFloors')).toBe(true);
    expect(before('numberOfFloors', 'buildingConditionType')).toBe(true);
    expect(groupOf('isUnderConstruction')).toBe(groupOf('buildingAge'));
    // Each on a row of its own, at half width.
    for (const f of ['buildingAge', 'numberOfFloors'])
      expect(document.querySelector(`[data-field="${f}"]`)).toHaveClass(
        'w-[calc(50%-0.5714rem)]',
        '@max-[64rem]/form-shell:w-full',
      );
  });

  it('lays the reference prices out in two even columns, the fire condition alone on its row', () => {
    render(<Harness nameInHeader />);
    expect(before('isMissingFromSurvey', 'governmentPricePerSqm')).toBe(true);
    expect(before('governmentPrice', 'fireInsuranceCode')).toBe(true);
    expect(before('fireInsuranceCode', 'buildingInsurancePrice')).toBe(true);
    expect(before('buildingInsurancePrice', 'buildingInsurancePriceOverride')).toBe(true);
  });

  it('draws the access chips, the ways of getting there, the road in front, then the road widths', () => {
    render(<Harness nameInHeader />);
    for (const f of ['transportationAccessType', 'roadPassInFrontOfLand'])
      expect(groupOf(f)).toBe(groupOf('carriagewayWidth'));
    expect(before('landEntranceExitType', 'transportationAccessType')).toBe(true);
    expect(before('transportationAccessType', 'roadPassInFrontOfLand')).toBe(true);
    expect(before('roadPassInFrontOfLand', 'carriagewayWidth')).toBe(true);
    expect(before('numberOfLanes', 'roadSurfaceType')).toBe(true);
    expect(span('roadPassInFrontOfLand')).toBe('col-span-12');
  });
});
