import { describe, expect, it } from 'vitest';
import {
  buildRequestPayload,
  submitCounts,
  withoutBlankRows,
  CUSTOMER_COLUMNS,
} from './requestRows';

describe('submitCounts', () => {
  it('counts the rows and files that are sent, not the blank starter rows', () => {
    const counts = submitCounts({
      customers: [{ name: '', contactNumber: '' }],
      properties: [{ propertyType: '', buildingType: '', buildingTypeOther: '', sellingPrice: '' }],
      titles: [{ documents: [{ fileName: 'a.pdf' }] }],
      documents: [{ fileName: 'b.pdf' }, { fileName: null }],
    });
    expect(counts).toEqual({ customers: 0, properties: 0, titles: 1, files: 2 });
  });

  it('counts a row with anything typed in it', () => {
    const counts = submitCounts({
      customers: [
        { name: 'Somchai', contactNumber: '' },
        { name: '', contactNumber: '' },
      ],
      properties: [
        { propertyType: '01', buildingType: '', buildingTypeOther: '', sellingPrice: '' },
      ],
    });
    expect(counts).toMatchObject({ customers: 1, properties: 1, titles: 0, files: 0 });
  });
});

describe('withoutBlankRows', () => {
  it('copes with a missing list', () => {
    expect(withoutBlankRows(undefined, CUSTOMER_COLUMNS)).toEqual([]);
  });
});

describe('buildRequestPayload', () => {
  const form = {
    purpose: '03',
    priority: 'Normal',
    requestor: { employeeId: 'P5229', name: 'X' },
    detail: {
      prevAppraisalId: 'prev-1',
      prevAppraisalReportNo: '69000002',
      hasAppraisalBook: false,
    },
    customers: [{ name: '', contactNumber: '' }],
    properties: [
      { propertyType: '01', buildingType: '', buildingTypeOther: '', sellingPrice: '' },
      { propertyType: '', buildingType: '', buildingTypeOther: '', sellingPrice: '' },
    ],
  };

  it('sends the purpose and the prior appraisal exactly as the form has them', () => {
    const payload = buildRequestPayload(form);
    expect(payload.purpose).toBe('03');
    expect(payload.detail).toEqual(form.detail);
  });

  it('does not send the form-only meta', () => {
    expect(buildRequestPayload({ ...form, meta: { isSubmitted: true } })).not.toHaveProperty(
      'meta',
    );
  });

  it('sends the requestor code, drops blank rows and turns an empty price into null', () => {
    const payload = buildRequestPayload(form);
    expect(payload.requestorEmployeeId).toBe('P5229');
    expect(payload).not.toHaveProperty('requestor');
    expect(payload.customers).toEqual([]);
    expect(payload.properties).toEqual([
      { propertyType: '01', buildingType: '', buildingTypeOther: '', sellingPrice: null },
    ]);
  });
});
