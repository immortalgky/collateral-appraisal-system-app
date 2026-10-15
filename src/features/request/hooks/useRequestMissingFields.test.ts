import { describe, expect, it } from 'vitest';
import type { ZodIssue } from 'zod';
import type { TFunction } from 'i18next';
import { createRequestForm, createRequestFormDefault } from '../schemas/form';
import {
  buildFieldLabeler,
  buildMissingSummary,
  collectIssues,
  countFiles,
  sectionOf,
  sectionTotal,
} from './useRequestMissingFields';

const issue = (...path: (string | number)[]) =>
  ({ path, message: 'x', code: 'custom' }) as ZodIssue;

// t echoes its key and interpolation so the assertions show which message was picked
const resolver = {
  t: (key: string, options?: Record<string, unknown>) =>
    options ? `${key}:${JSON.stringify(options)}` : key,
  fieldLabel: (path: string) =>
    ({
      'customers.name': 'Customer Name',
      'detail.address.houseNumber': 'House No',
      'detail.address.subDistrict': 'Sub District',
      'detail.contact.contactPersonName': 'Contact Name',
    })[path],
};

describe('sectionOf', () => {
  it.each([
    [['requestor', 'employeeId'], 's1'],
    [['customers', 0, 'name'], 's1'],
    [['detail', 'loanDetail', 'bankingSegment'], 's1'],
    [['properties', 0, 'propertyType'], 's2'],
    [['detail', 'address', 'houseNumber'], 's2'],
    [['detail', 'contact', 'dealerCode'], 's2'],
    [['detail', 'contact', 'contactPersonName'], 's5'],
    [['detail', 'appointment', 'appointmentDateTime'], 's5'],
    [['detail', 'fee', 'feePaymentType'], 's5'],
    [['titles', 0, 'titleNumber'], 'titles'],
  ] as const)('%j goes to %s', (path, section) => {
    expect(sectionOf([...path])).toBe(section);
  });
});

describe('buildMissingSummary', () => {
  it('groups issues by card, sums a title row into one item and labels from the configs', () => {
    const summary = buildMissingSummary(
      { customers: [{}], properties: [], titles: [{}, {}] },
      [
        issue('requestor', 'employeeId'),
        issue('customers', 0, 'name'),
        issue('customers', 0, 'name'), // same field twice: one item
        issue('detail', 'address', 'houseNumber'),
        issue('detail', 'contact', 'contactPersonName'),
        issue('titles', 1, 'titleNumber'),
        issue('titles', 1, 'ownerName'),
        issue('titles', 0, 'collateralType'),
      ],
      resolver,
    );

    expect(summary.items.s1.map(i => [i.label, i.path])).toEqual([
      ['page.missing.requestor', 'requestor.employeeId'],
      ['page.missing.rowField:{"label":"Customer Name","n":1}', 'customers.0.name'],
    ]);
    expect(summary.items.s2.map(i => i.label)).toEqual(['House No']);
    expect(summary.items.s5.map(i => i.path)).toEqual(['detail.contact.contactPersonName']);
    expect(summary.items.titles.map(i => [i.path, i.count])).toEqual([
      ['titles.0', 1],
      ['titles.1', 2],
    ]);
    expect(summary.total).toBe(2 + 1 + 1 + 3);
    expect(sectionTotal(summary, 'titles')).toBe(3);
    expect(summary.counts).toMatchObject({ customers: 1, properties: 0, titles: 2 });
  });

  it('counts required document slots that hold no file, request level and per title', () => {
    const values = {
      documents: [
        { isRequired: true, fileName: 'a.pdf' },
        { isRequired: true, fileName: null },
        { isRequired: false, fileName: null },
      ],
      titles: [{ documents: [{ isRequired: true, fileName: null }, { fileName: 'b.pdf' }] }],
    };
    const summary = buildMissingSummary(values, [], resolver);

    expect(summary.items.docs).toHaveLength(1);
    expect(summary.items.docs[0].count).toBe(1);
    expect(summary.items.titles[0].count).toBe(1);
    expect(summary.counts).toMatchObject({ requiredDocs: 2, requiredDocsDone: 1, files: 2 });
    expect(countFiles(values)).toBe(2);
    expect(summary.total).toBe(2);
  });

  it('is complete when nothing is missing', () => {
    const summary = buildMissingSummary({}, [], resolver);
    expect(summary.total).toBe(0);
    expect(Object.values(summary.items).flat()).toEqual([]);
  });
});

describe('what reaches the popover', () => {
  it('folds district and province into the sub-district and counts it once', () => {
    const summary = buildMissingSummary(
      {},
      [
        issue('detail', 'address', 'subDistrict'),
        issue('detail', 'address', 'district'),
        issue('detail', 'address', 'province'),
      ],
      resolver,
    );
    expect(summary.items.s2.map(i => [i.label, i.path])).toEqual([
      ['Sub District', 'detail.address.subDistrict'],
    ]);
    expect(summary.total).toBe(1);
  });

  it('never shows a raw path: a field with no label is left out', () => {
    const summary = buildMissingSummary(
      {},
      [issue('detail', 'something', 'unlabelled'), issue('customers', 0, 'name')],
      resolver,
    );
    const labels = Object.values(summary.items)
      .flat()
      .map(i => i.label);
    expect(labels.some(l => l.includes('unlabelled'))).toBe(false);
    expect(summary.total).toBe(1);
  });
});

describe('collectIssues', () => {
  const tKey = ((key: string) => key) as unknown as TFunction<'request'>;

  it('counts the purpose-conditional required fields even while base issues hide them from zod', () => {
    // An empty form fails the base rules, so zod never reaches the superRefine that holds the
    // conditional ones; purpose 02 makes the limits required.
    const values = { ...createRequestFormDefault, purpose: '02' };
    const summary = buildMissingSummary(values, collectIssues(createRequestForm, values), {
      t: resolver.t,
      fieldLabel: buildFieldLabeler(tKey),
    });

    const s1 = summary.items.s1.map(i => i.path);
    expect(s1).toContain('detail.loanDetail.additionalFacilityLimit');
    expect(s1).toContain('detail.loanDetail.previousFacilityLimit');
  });

  it('asks for the prior appraisal before a request is submitted, and not after', () => {
    const base = { ...createRequestFormDefault, purpose: '02' };
    const issuePaths = (values: object) =>
      collectIssues(createRequestForm, values).map(i => i.path.join('.'));

    expect(issuePaths({ ...base, meta: { isSubmitted: false } })).toContain(
      'detail.prevAppraisalReportNo',
    );
    // a draft that never had the meta key (old callers) is still asked
    expect(issuePaths(base)).toContain('detail.prevAppraisalReportNo');

    const submitted = { ...base, meta: { isSubmitted: true } };
    expect(issuePaths(submitted)).not.toContain('detail.prevAppraisalReportNo');
    const summary = buildMissingSummary(submitted, collectIssues(createRequestForm, submitted), {
      t: resolver.t,
      fieldLabel: buildFieldLabeler(tKey),
    });
    expect(summary.items.s1.map(i => i.path)).not.toContain('detail.prevAppraisalReportNo');
  });

  it('counts a missing selling price under the properties card for a RETAIL segment', () => {
    const values = {
      ...createRequestFormDefault,
      detail: {
        ...createRequestFormDefault.detail,
        loanDetail: { ...createRequestFormDefault.detail.loanDetail, bankingSegment: 'RETAIL' },
      },
      properties: [
        { propertyType: '01', buildingType: '', buildingTypeOther: '', sellingPrice: null },
      ],
    };
    const summary = buildMissingSummary(values, collectIssues(createRequestForm, values), {
      t: resolver.t,
      fieldLabel: buildFieldLabeler(tKey),
    });

    expect(summary.items.s2.map(i => i.path)).toContain('properties.0.sellingPrice');

    const other = {
      ...values,
      detail: {
        ...values.detail,
        loanDetail: { ...values.detail.loanDetail, bankingSegment: 'SME' },
      },
    };
    const noRetail = collectIssues(createRequestForm, other).map(i => i.path.join('.'));
    expect(noRetail).not.toContain('properties.0.sellingPrice');
  });

  it('counts an untouched price cell (an empty string) the same as null for a RETAIL segment', () => {
    const values = {
      ...createRequestFormDefault,
      detail: {
        ...createRequestFormDefault.detail,
        loanDetail: { ...createRequestFormDefault.detail.loanDetail, bankingSegment: 'RETAIL' },
      },
      properties: [
        { propertyType: '01', buildingType: '', buildingTypeOther: '', sellingPrice: '' },
      ],
    };
    const paths = collectIssues(createRequestForm, values).map(i => i.path.join('.'));
    expect(paths).toContain('properties.0.sellingPrice');
  });

  describe('the prior appraisal', () => {
    const PATH = 'detail.prevAppraisalReportNo';
    const summaryFor = (
      purpose: string,
      extra: Record<string, unknown> & { meta?: { isSubmitted: boolean } } = {},
    ) => {
      const { meta, ...detail } = extra;
      const values = {
        ...createRequestFormDefault,
        purpose,
        ...(meta ? { meta } : {}),
        detail: { ...createRequestFormDefault.detail, ...detail },
      };
      return {
        paths: collectIssues(createRequestForm, values).map(i => i.path.join('.')),
        summary: buildMissingSummary(values, collectIssues(createRequestForm, values), {
          t: resolver.t,
          fieldLabel: buildFieldLabeler(tKey),
        }),
      };
    };

    it.each(['02', '03', '04', '05', '06', '08', '09', '11', '12', '13'])(
      'is required for purpose %s, the purposes it is shown with a star for',
      purpose => {
        expect(summaryFor(purpose).paths).toContain(PATH);
      },
    );

    it.each(['01', '07', '10', '14'])('is not required for purpose %s', purpose => {
      expect(summaryFor(purpose).paths).not.toContain(PATH);
    });

    it('is counted under the request-information card until a prior is chosen', () => {
      expect(summaryFor('03').summary.items.s1.map(i => i.path)).toContain(PATH);
      const chosen = summaryFor('03', {
        prevAppraisalReportNo: '69000002',
        prevAppraisalId: 'a-1',
      });
      expect(chosen.summary.items.s1.map(i => i.path)).not.toContain(PATH);
    });

    it('is not asked for of a submitted request, which cannot choose one any more', () => {
      const meta = { meta: { isSubmitted: true } };
      expect(summaryFor('02', meta).paths).not.toContain(PATH);
      expect(summaryFor('02', meta).summary.items.s1.map(i => i.path)).not.toContain(PATH);
    });

    it('is still asked for of a draft, whether the flag is false or absent', () => {
      expect(summaryFor('02', { meta: { isSubmitted: false } }).paths).toContain(PATH);
      expect(summaryFor('02').paths).toContain(PATH);
    });

    it('counts a number with no id (a legacy or typed-in one) as filled', () => {
      const legacy = summaryFor('03', { prevAppraisalReportNo: '69000002', prevAppraisalId: null });
      expect(legacy.paths).not.toContain(PATH);
    });
  });
});
