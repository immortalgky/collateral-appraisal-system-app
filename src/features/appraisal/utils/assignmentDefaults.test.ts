import { describe, expect, it } from 'vitest';
import { assignmentFormDefaults } from '../schemas/administration';
import {
  correctSavedSelection,
  isAwaitingSeed,
  isReadyToSeed,
  shouldSkipTypeDefaults,
  shouldSeed,
  resolveFormDefaults,
  toFormDefaults,
} from './assignmentDefaults';

const open = { canAssignCompanyInSystem: true, isInternalDisabled: false, skipTypeDefaults: false };

describe('resolveFormDefaults', () => {
  it.each([
    {
      name: 'no defaults keeps the baseline',
      defaults: undefined,
      flags: open,
      expected: { assignmentType: 'external', assignmentMethod: 'quotation' },
    },
    {
      name: 'configured External + RoundRobin is applied',
      defaults: { assignmentType: 'external', assignmentMethod: 'roundrobin' },
      flags: open,
      expected: { assignmentType: 'external', assignmentMethod: 'roundrobin' },
    },
    {
      name: 'kill switch off moves External to external-offline with Manual',
      defaults: { assignmentType: 'external', assignmentMethod: 'roundrobin' },
      flags: { ...open, canAssignCompanyInSystem: false },
      expected: { assignmentType: 'external-offline', assignmentMethod: 'manual' },
    },
    {
      name: 'configured Internal over the facility limit moves to External with Manual',
      defaults: { assignmentType: 'internal', assignmentMethod: 'roundrobin' },
      flags: { ...open, isInternalDisabled: true },
      expected: { assignmentType: 'external', assignmentMethod: 'manual' },
    },
    {
      name: 'Internal + Quotation falls back to Manual',
      defaults: { assignmentType: 'internal', assignmentMethod: 'quotation' },
      flags: open,
      expected: { assignmentType: 'internal', assignmentMethod: 'manual' },
    },
    {
      name: 'Internal over the limit with the kill switch off chains to external-offline with Manual',
      defaults: { assignmentType: 'internal', assignmentMethod: 'roundrobin' },
      flags: { ...open, isInternalDisabled: true, canAssignCompanyInSystem: false },
      expected: { assignmentType: 'external-offline', assignmentMethod: 'manual' },
    },
    {
      name: 'External + Quotation with the kill switch off becomes external-offline with Manual',
      defaults: { assignmentType: 'external', assignmentMethod: 'quotation' },
      flags: { ...open, canAssignCompanyInSystem: false },
      expected: { assignmentType: 'external-offline', assignmentMethod: 'manual' },
    },
    {
      name: 'skipTypeDefaults (quotation or failed read) keeps the baseline External + Quotation',
      defaults: {
        assignmentType: 'internal',
        assignmentMethod: 'roundrobin',
        followupStaffMethod: 'manual',
      },
      flags: { ...open, skipTypeDefaults: true },
      expected: {
        assignmentType: 'external',
        assignmentMethod: 'quotation',
        followupStaffMethod: 'roundrobin',
      },
    },
    {
      name: 'followup method comes from the defaults',
      defaults: { followupStaffMethod: 'manual' },
      flags: open,
      expected: { followupStaffMethod: 'manual' },
    },
  ] as const)('$name', ({ defaults, flags, expected }) => {
    expect(resolveFormDefaults({ base: assignmentFormDefaults, defaults, ...flags })).toMatchObject(
      expected,
    );
  });
});

describe('resolveFormDefaults: previous company', () => {
  const company = {
    id: 'c-old',
    companyName: 'Old Co',
    registrationNo: '123',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    rating: 0,
    activeAssignments: 0,
  };
  const internalDefaults = { assignmentType: 'internal', assignmentMethod: 'roundrobin' } as const;
  const resolve = (flags: Partial<typeof open>, preselectCompany: typeof company | null) =>
    resolveFormDefaults({
      base: assignmentFormDefaults,
      defaults: internalDefaults,
      ...open,
      ...flags,
      preselectCompany,
    });

  it('chooses External + Manual with the company, over the Appraisal Type defaults', () => {
    expect(resolve({}, company)).toMatchObject({
      assignmentType: 'external',
      assignmentMethod: 'manual',
      companyId: 'c-old',
      selectedCompany: company,
    });
  });

  it('leaves the defaults alone when there is nothing to preselect', () => {
    expect(resolve({}, null)).toMatchObject({
      assignmentType: 'internal',
      assignmentMethod: 'roundrobin',
      companyId: null,
      selectedCompany: null,
    });
  });

  it.each([
    { name: 'in-system assignment is switched off', flags: { canAssignCompanyInSystem: false } },
    { name: 'a quotation owns the page', flags: { skipTypeDefaults: true } },
  ])('does not preselect when $name', ({ flags }) => {
    expect(resolve(flags, company)).toMatchObject({ companyId: null, selectedCompany: null });
  });
});

describe('toFormDefaults', () => {
  it('lowercases known values', () => {
    expect(
      toFormDefaults({
        assignmentType: 'External',
        assignmentMethod: 'RoundRobin',
        internalFollowupAssignmentMethod: 'Manual',
      }),
    ).toEqual({
      assignmentType: 'external',
      assignmentMethod: 'roundrobin',
      followupStaffMethod: 'manual',
    });
  });

  it('leaves unknown or null values undefined', () => {
    const result = toFormDefaults({
      assignmentType: 'Hybrid',
      assignmentMethod: null,
      internalFollowupAssignmentMethod: 'Quotation',
    } as never);
    expect(result).toEqual({
      assignmentType: undefined,
      assignmentMethod: undefined,
      followupStaffMethod: undefined,
    });
  });
});

describe('correctSavedSelection', () => {
  const saved = (assignmentType: string, assignmentMethod = 'roundrobin') =>
    ({
      ...assignmentFormDefaults,
      assignmentType,
      assignmentMethod,
      staffId: 'u1',
    }) as typeof assignmentFormDefaults;

  it.each([
    {
      name: 'external with the kill switch off becomes external-offline + manual, without its in-system company',
      values: { ...saved('external'), companyId: 'c1' },
      flags: { canAssignCompanyInSystem: false, isInternalDisabled: false, isReadOnly: false },
      expected: {
        assignmentType: 'external-offline',
        assignmentMethod: 'manual',
        staffId: 'u1',
        companyId: null,
        selectedCompany: null,
      },
    },
    {
      name: 'internal over the facility limit is cleared',
      values: saved('internal'),
      flags: { canAssignCompanyInSystem: true, isInternalDisabled: true, isReadOnly: false },
      expected: { assignmentType: '', assignmentMethod: 'roundrobin', staffId: null },
    },
    {
      name: 'external with the kill switch on is untouched',
      values: saved('external'),
      flags: { canAssignCompanyInSystem: true, isInternalDisabled: true, isReadOnly: false },
      expected: { assignmentType: 'external', assignmentMethod: 'roundrobin', staffId: 'u1' },
    },
    {
      name: 'internal under the limit is untouched',
      values: saved('internal'),
      flags: { canAssignCompanyInSystem: false, isInternalDisabled: false, isReadOnly: false },
      expected: { assignmentType: 'internal', assignmentMethod: 'roundrobin', staffId: 'u1' },
    },
    {
      name: 'external-offline is untouched',
      values: saved('external-offline', 'manual'),
      flags: { canAssignCompanyInSystem: false, isInternalDisabled: true, isReadOnly: false },
      expected: { assignmentType: 'external-offline', assignmentMethod: 'manual', staffId: 'u1' },
    },
    {
      name: 'a read-only page (assigned row or history view) keeps an external type with the switch off',
      values: saved('external'),
      flags: { canAssignCompanyInSystem: false, isInternalDisabled: false, isReadOnly: true },
      expected: { assignmentType: 'external', assignmentMethod: 'roundrobin', staffId: 'u1' },
    },
    {
      name: 'a read-only page (assigned row or history view) keeps an internal type over the limit',
      values: saved('internal'),
      flags: { canAssignCompanyInSystem: true, isInternalDisabled: true, isReadOnly: true },
      expected: { assignmentType: 'internal', assignmentMethod: 'roundrobin', staffId: 'u1' },
    },
  ])('$name', ({ values, flags, expected }) => {
    expect(correctSavedSelection(values, flags)).toMatchObject(expected);
  });
});

describe('shouldSeed', () => {
  const base = {
    seededAppraisalId: undefined as string | undefined,
    appraisalId: 'A' as string | undefined,
    hasSavedSelection: false,
    isDirty: false,
    isReady: true,
  };

  it.each([
    { name: 'fresh row, ready, never seeded: seeds', input: {}, want: true },
    {
      name: 'first seed happens even if the form is dirty',
      input: { seededAppraisalId: undefined, isDirty: true },
      want: true,
    },
    { name: 'fresh row, not ready: waits', input: { isReady: false }, want: false },
    {
      name: 'fresh row, already seeded: not again (refetch or draft save, even when not dirty)',
      input: { seededAppraisalId: 'A' },
      want: false,
    },
    {
      name: 'saved row, seeded, not dirty: re-seeds as its data loads',
      input: { seededAppraisalId: 'A', hasSavedSelection: true },
      want: true,
    },
    {
      name: 'saved row, seeded, dirty: leaves the edits alone',
      input: { seededAppraisalId: 'A', hasSavedSelection: true, isDirty: true },
      want: false,
    },
    {
      name: 'different appraisal seeds even if dirty',
      input: { seededAppraisalId: 'A', appraisalId: 'B', isDirty: true },
      want: true,
    },
    {
      name: 'different appraisal, not ready: waits',
      input: { seededAppraisalId: 'A', appraisalId: 'B', isReady: false },
      want: false,
    },
    { name: 'undefined appraisalId never seeds', input: { appraisalId: undefined }, want: false },
  ])('$name', ({ input, want }) => {
    expect(shouldSeed({ ...base, ...input })).toBe(want);
  });
});

describe('isReadyToSeed', () => {
  const idle = {
    hasSavedSelection: false,
    isFetchingAssignment: false,
    isFetchingConfig: false,
    isFetchingInputs: false,
  };

  it.each([
    { name: 'fresh row, all idle: ready', input: {}, want: true },
    { name: 'fresh row, inputs fetching: waits', input: { isFetchingInputs: true }, want: false },
    { name: 'assignment fetching: waits', input: { isFetchingAssignment: true }, want: false },
    { name: 'fresh row, config fetching: waits', input: { isFetchingConfig: true }, want: false },
    {
      name: 'saved row, config loading or fetching: waits',
      input: { hasSavedSelection: true, isFetchingConfig: true },
      want: false,
    },
    {
      name: 'saved row, inputs fetching: still ready (they only matter for a fresh row)',
      input: { hasSavedSelection: true, isFetchingInputs: true },
      want: true,
    },
    {
      name: 'saved row while the assignment refetches (after a draft save): no re-seed',
      input: { hasSavedSelection: true, isFetchingAssignment: true },
      want: false,
    },
  ])('$name', ({ input, want }) => {
    expect(isReadyToSeed({ ...idle, ...input })).toBe(want);
  });
});

describe('isAwaitingSeed', () => {
  const base = {
    appraisalId: 'A' as string | undefined,
    seededAppraisalId: undefined as string | undefined,
    isLoadingAssignment: false,
    isLoadingConfig: false,
  };

  it.each([
    { name: 'not yet seeded: awaiting', input: {}, want: true },
    {
      name: 'seeded for this appraisal: not awaiting',
      input: { seededAppraisalId: 'A' },
      want: false,
    },
    {
      name: 'seeded for a different appraisal (route change, saved or fresh row): awaiting',
      input: { seededAppraisalId: 'B' },
      want: true,
    },
    {
      name: 'empty appraisalId (task without an appraisal yet): not awaiting',
      input: { appraisalId: '' },
      want: false,
    },
    { name: 'undefined appraisalId: not awaiting', input: { appraisalId: undefined }, want: false },
    {
      name: 'no appraisalId, assignment loading: awaiting',
      input: { appraisalId: '', isLoadingAssignment: true },
      want: true,
    },
    {
      name: 'no appraisalId, config loading: awaiting',
      input: { appraisalId: undefined, isLoadingConfig: true },
      want: true,
    },
  ])('$name', ({ input, want }) => {
    expect(isAwaitingSeed({ ...base, ...input })).toBe(want);
  });
});

describe('shouldSkipTypeDefaults', () => {
  const q = (status: string, id = 'q1', requestDate = '2026-01-01T00:00:00Z') => ({
    id,
    status,
    requestDate,
  });
  const ok = {
    quotations: [] as ReturnType<typeof q>[] | undefined,
    isQuotationsError: false,
    hasRequestData: true,
    isRequestError: false,
    requestId: 'r1' as string | undefined,
  };

  it.each([
    { name: 'nothing wrong: defaults apply', input: {}, want: false },
    { name: 'in-progress quotation blocks', input: { quotations: [q('Sent')] }, want: true },
    { name: 'finalized quotation blocks', input: { quotations: [q('Finalized')] }, want: true },
    {
      name: 'cancelled quotation does not block',
      input: { quotations: [q('Cancelled')] },
      want: false,
    },
    {
      name: 'legacy closed quotation does not block',
      input: { quotations: [q('Closed')] },
      want: false,
    },
    {
      name: '[Cancelled, Finalized]: the finalized one is the active one, so it blocks',
      input: { quotations: [q('Cancelled', 'a'), q('Finalized', 'b')] },
      want: true,
    },
    {
      name: '[Cancelled, Sent]: an in-progress one blocks wherever it is',
      input: { quotations: [q('Cancelled', 'a'), q('Sent', 'b')] },
      want: true,
    },
    {
      name: '[Finalized, Cancelled]: blocks',
      input: { quotations: [q('Finalized', 'a'), q('Cancelled', 'b')] },
      want: true,
    },
    {
      name: '[Cancelled, Cancelled]: nothing active, does not block',
      input: { quotations: [q('Cancelled', 'a'), q('Cancelled', 'b')] },
      want: false,
    },
    {
      name: 'quotations error without data blocks',
      input: { quotations: undefined, isQuotationsError: true },
      want: true,
    },
    {
      name: 'quotations error with cached data does not block',
      input: { isQuotationsError: true },
      want: false,
    },
    {
      name: 'request error without data blocks',
      input: { hasRequestData: false, isRequestError: true },
      want: true,
    },
    {
      name: 'request error with cached data does not block',
      input: { isRequestError: true },
      want: false,
    },
    { name: 'no requestId blocks', input: { requestId: undefined }, want: true },
  ])('$name', ({ input, want }) => {
    expect(shouldSkipTypeDefaults({ ...ok, ...input })).toBe(want);
  });
});
