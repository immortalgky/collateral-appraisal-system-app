import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import '@/i18n';
import { useParameterStore } from '@/shared/store';
import { useTitleLabel } from './useTitleLabel';

const land = (titleNumber: string) => ({ collateralType: '01', titleNumber });
const plate = (licensePlateNumber: string) => ({ collateralType: '10', licensePlateNumber });

describe('useTitleLabel', () => {
  const { result } = renderHook(() => useTitleLabel());
  const label = (titles: Parameters<typeof result.current>[0], index: number) =>
    result.current(titles)[index];

  it('names a title by its number, and falls back to its place while the number is empty', () => {
    expect(label([land(' 12345 ')], 0)).toBe('Title 12345 · 01 (#1)');
    expect(label([land('1'), land('')], 1)).toBe('Item 2 · 01');
  });

  it('lets a licence plate, a registration or a vessel registration stand on its own', () => {
    expect(label([plate('AB 1234')], 0)).toBe('AB 1234 · 10 (#1)');
    expect(
      label([{ collateralType: '11', registrationStatus: true, registrationNumber: 'M-9' }], 0),
    ).toBe('M-9 · 11 (#1)');
    expect(label([{ collateralType: '12', vesselRegistrationNumber: 'V-7' }], 0)).toBe(
      'V-7 · 12 (#1)',
    );
  });

  it('names a title with no number the neutral way, in a movable table too', () => {
    // a vehicle with no plate yet is not a "โฉนด": it is item n of its own table
    expect(label([land('1'), plate(''), plate('')], 2)).toBe('Item 2 · 10');
    expect(label([{ collateralType: '10', vehicleRegistrationNumber: 'R-5' }], 0)).toBe(
      'R-5 · 10 (#1)',
    );
    expect(label([land('')], 0)).toBe('Item 1 · 01');
  });

  it('tells two titles with the same number apart by their place', () => {
    const titles = [land('1'), land('1')];
    expect(label(titles, 0)).toBe('Title 1 · 01 (#1)');
    expect(label(titles, 1)).toBe('Title 1 · 01 (#2)');
  });

  it('counts the place in the title’s own table, the way the title tables number their rows', () => {
    // estate, movable, estate, movable: each table counts from 1, so the #n matches the table
    const titles = [land('1'), plate('AA 1'), land('2'), plate('BB 2')];
    expect(label(titles, 2)).toBe('Title 2 · 01 (#2)');
    expect(label(titles, 1)).toBe('AA 1 · 10 (#1)');
    expect(label(titles, 3)).toBe('BB 2 · 10 (#2)');
  });

  it('adds the collateral type name when the parameter list has it', () => {
    useParameterStore.getState().setParameters([
      {
        parId: 1,
        group: 'CollateralType',
        country: 'TH',
        language: 'en',
        code: '01',
        description: 'Land',
        isActive: true,
        seqNo: 1,
      },
    ]);
    const { result: typed } = renderHook(() => useTitleLabel());
    expect(typed.current([land('1'), land('2'), land('5')])[2]).toBe('Title 5 · Land (#3)');
    expect(typed.current([land('')])[0]).toBe('Item 1 · Land');
    useParameterStore.getState().setParameters([]);
  });

  it('follows a list changed in place: a title switched to a vehicle moves tables and ranks again', () => {
    const titles: { collateralType: string; titleNumber?: string; licensePlateNumber?: string }[] =
      [land('1'), land('2'), land('3')];
    expect(label(titles, 2)).toBe('Title 3 · 01 (#3)');
    titles[1].collateralType = '10';
    titles[1].licensePlateNumber = 'AA 1';
    expect(label(titles, 2)).toBe('Title 3 · 01 (#2)');
    expect(label(titles, 1)).toBe('AA 1 · 10 (#1)');
  });

  it('names a condo by its first land-deed number and how many more follow, never the whole list', () => {
    const condo = (titleNumber: string, collateralType = '08') => ({ collateralType, titleNumber });
    const fifty = Array.from({ length: 50 }, (_, k) => 1000 + k);
    // whichever separator the field uses, and a range counts as one entry
    expect(label([condo(fifty.join(', '))], 0)).toBe('Title 1000 +49 · 08 (#1)');
    expect(label([condo(fifty.join(','))], 0)).toBe('Title 1000 +49 · 08 (#1)');
    expect(label([condo('1234, 1236-1250, 1300', '28')], 0)).toBe('Title 1234 +2 · 28 (#1)');
    // one number, no "+0"
    expect(label([condo('1234')], 0)).toBe('Title 1234 · 08 (#1)');
    expect(label([condo('1234', '33')], 0)).toBe('Title 1234 · 33 (#1)');
    // land titles are not summarised, and an empty condo number falls back like any other
    expect(label([land('12, 13')], 0)).toBe('Title 12, 13 · 01 (#1)');
    expect(label([land('1'), condo('')], 1)).toBe('Item 2 · 08');
  });
});
