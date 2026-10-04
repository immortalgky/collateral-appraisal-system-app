import { describe, expect, it } from 'vitest';
import {
  dateOnlyValue,
  diffFormValues,
  formatDiffValue,
  groupDiff,
  isSameDayChange,
} from './formDiff';

const change = (label: string, from: unknown, to: unknown) =>
  expect.objectContaining({ kind: 'changed', label, from, to });

describe('diffFormValues — plain fields', () => {
  it('reports a changed field from → to under the form label', () => {
    const diff = diffFormValues({ landOffice: 'A' }, { landOffice: 'B' });
    expect(diff).toEqual([change('Land Office', 'A', 'B')]);
  });

  it('treats null, undefined and "" as the same empty', () => {
    const diff = diffFormValues({ a: null, b: undefined, c: '' }, { a: '', b: null, c: undefined });
    expect(diff).toEqual([]);
  });

  it('reads a switch never answered as No, but not Yes as No', () => {
    expect(diffFormValues({ customFlag: null }, { customFlag: false })).toEqual([]);
    expect(diffFormValues({ customFlag: true }, { customFlag: false })).toEqual([
      change('Custom Flag', true, false),
    ]);
  });

  it('reports a field filled in from empty', () => {
    const diff = diffFormValues({ customNote: null }, { customNote: 'x' });
    expect(diff).toEqual([change('Custom Note', null, 'x')]);
  });

  it('treats a number and its numeric string as the same, but not two different strings', () => {
    expect(diffFormValues({ n: 5 }, { n: '5' })).toEqual([]);
    expect(diffFormValues({ n: 5 }, { n: '5.5' })).toHaveLength(1);
    expect(diffFormValues({ titleNumber: '007' }, { titleNumber: '7' })).toHaveLength(1);
  });

  it('never lists the reason or ids', () => {
    expect(diffFormValues({ reason: '', id: 'a' }, { reason: 'why', id: 'b' })).toEqual([]);
  });

  it('shows the name beside a geocode instead of the code, and hides the name field', () => {
    const diff = diffFormValues(
      { subDistrict: '100101', subDistrictName: 'Phra Nakhon' },
      { subDistrict: '100201', subDistrictName: 'Dusit' },
    );
    expect(diff).toEqual([change('Sub District', 'Phra Nakhon', 'Dusit')]);
  });

  it('never lists what the page fills in for itself as it opens', () => {
    // Absent from the record, present on screen: the table's average %/year and the postcodes the
    // location pickers look up from the sub-district.
    const before = {
      subDistrict: '100101',
      dopaSubDistrict: '100101',
      postcode: null,
      dopaPostcode: null,
      depreciationDetails: [{ id: 'd1' }],
    };
    const after = {
      ...before,
      postcode: '-',
      dopaPostcode: '10200',
      depreciationDetails: [{ id: 'd1', totalDepreciationPercentPerYear: 3 }],
    };
    expect(diffFormValues(before, after)).toEqual([]);
    // A postcode with no picker beside it is a stored field like any other.
    expect(diffFormValues({ postcode: '10200' }, { postcode: '10300' })).toHaveLength(1);
  });

  it('compares the depreciation figures at the places the record stores them', () => {
    const row = (v: Record<string, unknown>) => ({ depreciationDetails: [{ id: 'd1', ...v }] });

    // Recomputed on screen to more places, stored the same as before.
    expect(
      diffFormValues(
        row({ pricePerSqMAfterDepreciation: 7754.93, priceDepreciation: 205277.63 }),
        row({ pricePerSqMAfterDepreciation: 7754.9325, priceDepreciation: 205277.625 }),
      ),
    ).toEqual([]);
    // Percentages at four places: 3 × 1.1 is 3.3000000000000003 in floating point.
    expect(
      diffFormValues(
        row({ totalDepreciationPct: 3.3, depreciationPeriods: [{ totalDepreciationPct: 3.3 }] }),
        row({
          totalDepreciationPct: 3 * 1.1,
          depreciationPeriods: [{ totalDepreciationPct: 3 * 1.1 }],
        }),
      ),
    ).toEqual([]);
  });

  it('rounds the decimal the payload carries, as the server does, not the float', () => {
    const row = (v: number) => ({ depreciationDetails: [{ id: 'd1', priceDepreciation: v }] });
    // 1.005 posts as "1.005" and is stored 1.01; 205277.62499999997 posts as such and is stored .62.
    expect(diffFormValues(row(1.01), row(1.005))).toEqual([]);
    expect(diffFormValues(row(205277.62), row(205277.62499999997))).toEqual([]);
    // A fully depreciated row lands on float noise below zero; it is stored as 0.00, not -0.00.
    expect(diffFormValues(row(0), row(-1.4551915228366852e-10))).toEqual([]);
  });

  it('shows a real change as it will be stored', () => {
    const row = (v: unknown) => ({
      depreciationDetails: [{ id: 'd1', pricePerSqMAfterDepreciation: v }],
    });
    expect(diffFormValues(row(1163239.8), row(1163239.9525))).toEqual([
      expect.objectContaining({ from: '1163239.80', to: '1163239.95' }),
    ]);
    // A blank stays blank, not 0.
    expect(diffFormValues(row(null), row(5000))).toEqual([
      expect.objectContaining({ from: null, to: '5000.00' }),
    ]);
  });

  it('summarises an added depreciation row with its stored figures', () => {
    const diff = diffFormValues(
      { depreciationDetails: [] },
      { depreciationDetails: [{ areaDescription: 'Main', priceBeforeDepreciation: 1368517.505 }] },
    );
    expect(diff).toEqual([
      expect.objectContaining({ kind: 'added', to: expect.stringContaining('1368517.51') }),
    ]);
  });

  it('keeps comparing every other number exactly, and the same names outside the depreciation table', () => {
    expect(diffFormValues({ latitude: 13.75 }, { latitude: 13.751 })).toHaveLength(1);
    expect(diffFormValues({ priceDepreciation: 1.23 }, { priceDepreciation: 1.234 })).toHaveLength(
      1,
    );
  });

  it('compares a list of plain values as a whole', () => {
    expect(diffFormValues({ roads: ['a', 'b'] }, { roads: ['a', 'b'] })).toEqual([]);
    expect(diffFormValues({ roads: ['a'] }, { roads: ['a', 'b'] })).toHaveLength(1);
  });

  it('prefixes a field inside a nested block with the block', () => {
    const diff = diffFormValues(
      { leaseAgreement: { customNote: 'a' } },
      { leaseAgreement: { customNote: 'b' } },
    );
    expect(diff).toEqual([change('Lease Agreement · Custom Note', 'a', 'b')]);
  });

  it('reads a block that was null as empty', () => {
    const diff = diffFormValues({ leaseAgreement: null }, { leaseAgreement: { customNote: 'b' } });
    expect(diff).toEqual([change('Lease Agreement · Custom Note', null, 'b')]);
  });
});

describe('diffFormValues — tables', () => {
  const title = (id: string | undefined, titleNumber: string, rai: number) => ({
    ...(id ? { id } : {}),
    titleNumber,
    titleType: 'DEED',
    rai,
  });

  it('reports a changed cell under the table, on the row named by its title number', () => {
    const diff = diffFormValues(
      { titles: [title('t1', '1234', 1)] },
      { titles: [title('t1', '1234', 2)] },
    );
    expect(diff).toEqual([
      expect.objectContaining({
        group: 'Land titles',
        kind: 'changed',
        label: '#1234 · Rai',
        from: 1,
        to: 2,
      }),
    ]);
  });

  it('reports a row with no id as added, summarised in a line', () => {
    const before = { titles: [title('t1', '1234', 1)] };
    const after = { titles: [title('t1', '1234', 1), title(undefined, '99', 3)] };
    expect(diffFormValues(before, after)).toEqual([
      expect.objectContaining({
        group: 'Land titles',
        kind: 'added',
        label: '#99',
        to: expect.stringContaining('Title Number 99'),
      }),
    ]);
  });

  it('reports a move as one title-order entry and nothing per row', () => {
    const before = { titles: [title('t1', '9876', 1), title('t2', '1234', 1)] };
    const after = { titles: [title('t2', '1234', 1), title('t1', '9876', 1)] };
    expect(diffFormValues(before, after)).toEqual([
      expect.objectContaining({
        group: 'Land titles',
        kind: 'changed',
        label: 'Title Order',
        from: ['9876', '1234'],
        to: ['1234', '9876'],
      }),
    ]);
  });

  it('a title added at the end is only an added row; one added on top also moves the order', () => {
    const before = { titles: [title('t1', '9876', 1)] };
    const atEnd = diffFormValues(before, {
      titles: [title('t1', '9876', 1), title(undefined, '1', 1)],
    });
    expect(atEnd.map(e => e.kind)).toEqual(['added']);

    const onTop = diffFormValues(before, {
      titles: [title(undefined, '1', 1), title('t1', '9876', 1)],
    });
    expect(onTop.map(e => e.kind)).toEqual(['changed', 'added']);
    expect(onTop[0]).toMatchObject({ label: 'Title Order', to: ['1', '9876'] });
  });

  it('tells apart titles that share a number when they swap', () => {
    const before = { titles: [title('t1', '111', 1), title('t2', '111', 2)] };
    const after = { titles: [title('t2', '111', 2), title('t1', '111', 1)] };
    expect(diffFormValues(before, after)).toEqual([
      expect.objectContaining({
        label: 'Title Order',
        from: ['111', '111 (2)'],
        to: ['111 (2)', '111'],
      }),
    ]);
  });

  it('names a moved title by its new number; a number added back in place is no order change', () => {
    const renumbered = diffFormValues(
      { titles: [title('a', '111', 1), title('b', '222', 1)] },
      { titles: [title('b', '222', 1), title('a', '999', 1)] },
    );
    expect(renumbered[0]).toMatchObject({
      label: 'Title Order',
      from: ['111', '222'],
      to: ['222', '999'],
    });

    const replaced = diffFormValues(
      { titles: [title('a', '111', 1), title('b', '222', 1)] },
      { titles: [title(undefined, '111', 1), title('b', '222', 1)] },
    );
    const order = replaced.find(e => e.label === 'Title Order');
    expect(order).toBeUndefined();
  });

  it('reports a row that is gone as removed', () => {
    const before = { titles: [title('t1', '1234', 1), title('t2', '55', 1)] };
    const after = { titles: [title('t1', '1234', 1)] };
    expect(diffFormValues(before, after)).toEqual([
      expect.objectContaining({
        group: 'Land titles',
        kind: 'removed',
        label: '#55',
        from: expect.stringContaining('Title Number 55'),
      }),
    ]);
  });

  it('matches a title that lost its id in the edit dialog by its number', () => {
    const diff = diffFormValues(
      { titles: [title('t1', '1', 1), title('t2', '2', 1)] },
      { titles: [title(undefined, '2', 9)] },
    );
    expect(diff.map(d => [d.kind, d.label])).toEqual([
      ['changed', '#2 · Rai'],
      ['removed', '#1'],
    ]);
  });

  it('numbers the rows of a table without titles from 1', () => {
    const diff = diffFormValues(
      {
        landAreaDeductions: [
          { id: 'd1', areaInSqWa: 10 },
          { id: 'd2', areaInSqWa: 20 },
        ],
      },
      {
        landAreaDeductions: [
          { id: 'd1', areaInSqWa: 10 },
          { id: 'd2', areaInSqWa: 25 },
        ],
      },
    );
    expect(diff).toEqual([
      expect.objectContaining({
        group: 'Land area deductions',
        label: '#2 · Area In Sq Wa',
        from: 20,
        to: 25,
      }),
    ]);
  });

  it('pairs rows that never had ids by position', () => {
    const diff = diffFormValues(
      { upFrontEntries: [{ atYear: 1, upFrontAmount: 100 }] },
      {
        upFrontEntries: [
          { atYear: 1, upFrontAmount: 150 },
          { atYear: 2, upFrontAmount: 50 },
        ],
      },
    );
    expect(diff.map(d => [d.kind, d.label])).toEqual([
      ['changed', '#1 · Up Front Amount'],
      ['added', '#2'],
    ]);
  });

  it('names a nested table inside its parent row', () => {
    const diff = diffFormValues(
      { depreciationDetails: [{ id: 'p1', depreciationPeriods: [{ depreciationPerYear: 2 }] }] },
      { depreciationDetails: [{ id: 'p1', depreciationPeriods: [{ depreciationPerYear: 3 }] }] },
    );
    expect(diff).toEqual([
      expect.objectContaining({
        group: 'Depreciation',
        label: '#1 · Periods #1 · Depreciation Per Year',
        from: '2.0000',
        to: '3.0000',
      }),
    ]);
  });

  it('says nothing about an unchanged table', () => {
    const rows = [title('t1', '1', 1)];
    expect(diffFormValues({ titles: rows }, { titles: [...rows] })).toEqual([]);
  });
});

describe('groupDiff', () => {
  it('puts plain fields first, then each table in the order it first changed', () => {
    const groups = groupDiff(
      diffFormValues(
        { a: 1, titles: [{ id: 't', rai: 1 }], landAreaDeductions: [] },
        { a: 2, titles: [{ id: 't', rai: 2 }], landAreaDeductions: [{ areaInSqWa: 1 }] },
      ),
    );
    expect(groups.map(g => g.group)).toEqual(['', 'Land titles', 'Land area deductions']);
  });

  it('is empty for no differences', () => {
    expect(groupDiff([])).toEqual([]);
  });
});

describe('formatDiffValue', () => {
  it('reads empty as a dash and booleans as Yes / No', () => {
    expect(formatDiffValue(null)).toBe('—');
    expect(formatDiffValue('')).toBe('—');
    expect(formatDiffValue(true)).toBe('Yes');
    expect(formatDiffValue(false)).toBe('No');
    expect(formatDiffValue(0)).toBe('0');
    expect(formatDiffValue(['a', 'b'])).toBe('a, b');
  });
});

describe('dateOnlyValue', () => {
  it('drops the time part of a date-input field, however the field is named', () => {
    expect(dateOnlyValue('constructionLicenseExpirationDate', '2026-05-01T14:30:00')).toBe(
      '01/05/2026',
    );
    expect(
      dateOnlyValue('Building.ConstructionLicenseExpirationDate', '1991-01-06T09:00:00+07:00'),
    ).toBe('06/01/1991');
    // Read off the configs: every date-input field, not one hard-coded name.
    expect(dateOnlyValue('leaseAgreement.leaseStartDate', '2026-05-01T00:00:00')).toBe(
      '01/05/2026',
    );
    expect(dateOnlyValue('machine.purchaseDate', '2026-05-01T14:30:00')).toBe('01/05/2026');
    // Drawn by hand in RentalInfoForm, so named explicitly rather than read from a config.
    expect(dateOnlyValue('rentalInfo.upFrontEntries[0].atYear', '2026-04-01T00:00:00+07:00')).toBe(
      '01/04/2026',
    );
    expect(dateOnlyValue('rentalInfo.scheduleEntries[2].contractEnd', '2028-03-31T00:00:00')).toBe(
      '31/03/2028',
    );
  });

  it('leaves a value that is not an ISO date-time alone', () => {
    expect(dateOnlyValue('constructionLicenseExpirationDate', '01/05/2026')).toBe('01/05/2026');
    // A bare date reads the same as a date-time of that day.
    expect(dateOnlyValue('constructionLicenseExpirationDate', '2026-05-01')).toBe('01/05/2026');
    expect(dateOnlyValue('constructionLicenseExpirationDate', null)).toBeNull();
  });

  it('leaves other fields alone, including one that only ends like a date field', () => {
    expect(dateOnlyValue('appointmentDateTime', '2026-05-01T14:30:00')).toBe('2026-05-01T14:30:00');
    expect(dateOnlyValue('priorPurchaseDate', '2026-05-01T14:30:00')).toBe('2026-05-01T14:30:00');
  });
});

describe('diffFormValues — date-only fields', () => {
  it('does not list the same day re-picked with another time', () => {
    const before = { constructionLicenseExpirationDate: '2025-01-01T09:30:00+07:00' };
    const after = { constructionLicenseExpirationDate: '2025-01-01T00:00:00+07:00' };
    expect(diffFormValues(before, after)).toEqual([]);
    // A plain date and the same day with a time are one date too.
    expect(
      diffFormValues(
        { constructionLicenseExpirationDate: '2025-01-01' },
        { constructionLicenseExpirationDate: '2025-01-01T00:00:00+07:00' },
      ),
    ).toEqual([]);
  });

  it('still lists a different day, and keeps the time of a field that is not date-only', () => {
    const diff = diffFormValues(
      { constructionLicenseExpirationDate: '2025-01-01T09:30:00+07:00', appointmentDateTime: 'a' },
      { constructionLicenseExpirationDate: '2025-01-02T09:30:00+07:00', appointmentDateTime: 'b' },
    );
    expect(diff).toHaveLength(2);
    expect(
      diffFormValues(
        { appointmentDateTime: '2025-01-01T09:30:00+07:00' },
        { appointmentDateTime: '2025-01-01T00:00:00+07:00' },
      ),
    ).toHaveLength(1);
  });
});

describe('diffFormValues — date-only cells of an added row', () => {
  it('shows the date of an advance-rent row added, not the raw ISO date-time', () => {
    const diff = diffFormValues(
      { rentalInfo: { upFrontEntries: [] } },
      {
        rentalInfo: {
          upFrontEntries: [{ atYear: '2026-04-01T00:00:00+07:00', upFrontAmount: 300000 }],
        },
      },
    );
    const added = diff.find(d => d.kind === 'added');
    expect(added?.to).toContain('01/04/2026');
    expect(added?.to).not.toContain('T00:00');
  });
});

describe('date-only fields in the generated vehicle / vessel forms', () => {
  it('reads registrationDate as a date, from the generated field config', () => {
    expect(dateOnlyValue('registrationDate', '2026-01-01T09:00:00+07:00')).toBe('01/01/2026');
    expect(dateOnlyValue('Vessel.RegistrationDate', '2026-01-01T09:00:00')).toBe('01/01/2026');
  });
});

describe('isSameDayChange', () => {
  it('is true for a time-only change of a date-only field, as the audit logs it', () => {
    expect(
      isSameDayChange(
        'Building.ConstructionLicenseExpirationDate',
        '2025-01-01T09:30:00+07:00',
        '2025-01-01T00:00:00+07:00',
      ),
    ).toBe(true);
  });

  it('is false for another day, a missing side, or a field that is not date-only', () => {
    const field = 'Building.ConstructionLicenseExpirationDate';
    expect(isSameDayChange(field, '2025-01-01T09:30:00', '2025-01-02T09:30:00')).toBe(false);
    expect(isSameDayChange(field, null, '2025-01-01T00:00:00')).toBe(false);
    expect(
      isSameDayChange(
        'Appointment.AppointmentDateTime',
        '2025-01-01T09:30:00',
        '2025-01-01T00:00:00',
      ),
    ).toBe(false);
  });
});

describe('dateOnlyValue — the summary of a logged row', () => {
  it('formats the ISO date-time inside an advance-rent row, as written', () => {
    expect(dateOnlyValue('RentalInfo.UpFrontEntries[2]', '2026-04-01T00:00:00+07:00, 300000')).toBe(
      '01/04/2026, 300000',
    );
    // A summary the backend cut short still reads as a date.
    expect(dateOnlyValue('RentalInfo.UpFrontEntries[0]', '2026-04-01T00:00:0…')).toBe(
      '01/04/2026…',
    );
  });

  it('leaves the rows of other collections, and the collection itself, alone', () => {
    const raw = '2026-04-01T00:00:00, 300000';
    expect(dateOnlyValue('RentalInfo.GrowthPeriodEntries[0]', raw)).toBe(raw);
    expect(dateOnlyValue('RentalInfo.UpFrontEntries', raw)).toBe(raw);
  });
});
