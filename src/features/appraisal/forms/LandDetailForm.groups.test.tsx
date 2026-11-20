import { describe, expect, it } from 'vitest';
import '@/i18n';
import { FormProvider, useForm } from 'react-hook-form';
import { render, screen } from '@/test/test-utils';
import { createLandFormDefault } from '../schemas/form';
import { PropertyNameInHeaderContext } from '../components/propertyNameInHeader';
import LandDetailForm from './LandDetailForm';

/** The land form's groups, in the order the report prints them (the approved regrouping). */

/** The `auto | 1fr` row a toggle and its field share (see togglePairs), or null. */
const pairRow = (f: string) =>
  document
    .querySelector<HTMLElement>(`[data-field="${f}"]`)
    ?.parentElement?.className.includes('grid-cols-[auto_minmax(0,1fr)]')
    ? document.querySelector<HTMLElement>(`[data-field="${f}"]`)!.parentElement
    : null;

const Harness = ({ nameInHeader }: { nameInHeader: boolean }) => {
  const methods = useForm<Record<string, unknown>>({ defaultValues: { ...createLandFormDefault } });
  return (
    <PropertyNameInHeaderContext.Provider value={nameInHeader}>
      <FormProvider {...methods}>
        <LandDetailForm />
      </FormProvider>
    </PropertyNameInHeaderContext.Provider>
  );
};

const groups = () => screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);
const groupOf = (field: string) => {
  const el = document.querySelector(`[data-field="${field}"]`);
  return el?.closest('section')?.querySelector('h3')?.textContent;
};
/** Document order: does `a` come before `b`? */
const before = (a: string, b: string) => {
  const first = document.querySelector(`[data-field="${a}"]`);
  const second = document.querySelector(`[data-field="${b}"]`);
  if (!first || !second) return false;
  return (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
};

describe('land form groups', () => {
  it('runs ownership, location, area, access, utilities, physical, limitation, remark', () => {
    render(<Harness nameInHeader />);
    expect(groups().slice(0, 7)).toEqual([
      'Ownership & Obligations',
      'Location',
      'Area, Zoning & Use',
      'Access & Road',
      'Utilities',
      'Physical Characteristics',
      'Limitations & Legal',
    ]);
    expect(groups()).toHaveLength(8);
  });

  it('has no name group when the header carries the name, and one first when it does not', () => {
    const { unmount } = render(<Harness nameInHeader />);
    expect(document.querySelector('[data-field="propertyName"]')).toBeNull();
    unmount();
    render(<Harness nameInHeader={false} />);
    expect(groups()[0]).toBe('Identification');
    expect(groupOf('propertyName')).toBe('Identification');
    expect(groups()).toHaveLength(9);
  });

  it('puts each field in its group', () => {
    render(<Harness nameInHeader />);
    expect(groupOf('obligationType')).toBe('Ownership & Obligations');
    expect(groupOf('isRentedOut')).toBe('Ownership & Obligations');
    expect(groupOf('environmentProblems')).toBe('Area, Zoning & Use');
    expect(groupOf('plotLocationType')).toBe('Physical Characteristics');
    expect(groupOf('landDescription')).toBe('Physical Characteristics');
    expect(groupOf('isLandLocationVerified')).toBe('Location');
  });

  it('follows the field-size standard', () => {
    render(<Harness nameInHeader />);
    const span = (f: string) =>
      document
        .querySelector<HTMLElement>(`[data-field="${f}"]`)
        ?.className.match(/col-span-\d+/)?.[0];
    const spans: Record<string, string> = {
      isRentedOut: 'col-span-12',
      street: 'col-span-6',
      soi: 'col-span-3',
      distanceFromMainRoad: 'col-span-3',
      roadPassInFrontOfLand: 'col-span-12',
      carriagewayWidth: 'col-span-4',
      rightOfWayWidth: 'col-span-4',
      numberOfLanes: 'col-span-4',
      roadFrontage: 'col-span-6',
      numberOfSidesFacingRoad: 'col-span-6',
      landFillPercent: 'col-span-6',
      soilLevel: 'col-span-6',
      pondArea: 'col-span-6',
      pondDepth: 'col-span-6',
    };
    for (const [f, want] of Object.entries(spans)) expect([f, span(f)]).toEqual([f, want]);
    expect(pairRow('isOwnerVerifiedLand')).not.toBeNull();
    expect(pairRow('isOwnerVerifiedLand')).toBe(pairRow('ownerNameLand'));
    expect(span('isOwnerVerifiedLand')).toBeUndefined();
    // The position check flows beside the chips it was checked from: no grid span of its own.
    expect(span('isLandLocationVerified')).toBeUndefined();
    expect(document.querySelector('[data-field="isLandLocationVerified"]')?.parentElement).toBe(
      document.querySelector('[data-field="landCheckMethodType"]')?.parentElement,
    );
    // Lanes, frontage and sides come before the surface.
    expect(before('numberOfSidesFacingRoad', 'roadSurfaceType')).toBe(true);
  });

  it('puts the surroundings chips right after the location chips, before the allocation', () => {
    render(<Harness nameInHeader />);
    expect(before('landZoneType', 'environmentType')).toBe(true);
    expect(before('environmentType', 'allocationType')).toBe(true);
    expect(before('environmentType', 'propertyAnticipationType')).toBe(true);
    expect(document.querySelector('[data-field="environmentType"]')).toHaveClass('col-span-12');
    expect(groupOf('environmentType')).toBe(groupOf('landZoneType'));
  });

  it('puts the position check at the end of the location, and the description before the boundary', () => {
    render(<Harness nameInHeader />);
    expect(before('distanceFromMainRoad', 'isLandLocationVerified')).toBe(true);
    expect(before('landShapeType', 'plotLocationType')).toBe(true);
    expect(before('plotLocationType', 'landFillType')).toBe(true);
    expect(before('pondDepth', 'landDescription')).toBe(true);
    expect(document.querySelector('[data-field="hasBuilding"]')).toBeNull();
    expect(document.querySelector('[data-field="hasBuildingOther"]')).toBeNull();
  });

  it('lists the limitation chips, and what the chips open follows their order', async () => {
    const { user } = render(<Harness nameInHeader />);
    const chips = () =>
      [...document.querySelectorAll('[data-field="limitationFlags"] button')].map(b =>
        b.textContent?.trim(),
      );
    expect(chips()).toEqual(['In Line Expropriate', 'Is Forest Boundary', 'Others']);
    for (const name of ['In Line Expropriate', 'Is Forest Boundary', 'Others'])
      await user.click(screen.getByRole('button', { name }));
    expect(document.querySelector('[data-field="expropriationRemark"]')).toBeNull();
    expect(document.querySelector('[data-field="isExpropriated"]')).toBeNull();
    // The decree, the remarks, the landlocked plot and the distance from the power line are not asked.
    for (const f of [
      'royalDecree',
      'expropriationLineRemark',
      'forestBoundaryRemark',
      'isLandlocked',
      'landlockedRemark',
      'hasElectricity',
      'electricityDistance',
      'electricityRemark',
    ])
      expect(document.querySelector(`[data-field="${f}"]`)).toBeNull();
    // The text of "Others" is the last row of the section.
    expect(before('limitationFlags', 'otherLegalLimitations')).toBe(true);
    // The right restriction opens the section; the other limitations close it.
    expect(before('evictionType', 'limitationFlags')).toBe(true);
  });
});
