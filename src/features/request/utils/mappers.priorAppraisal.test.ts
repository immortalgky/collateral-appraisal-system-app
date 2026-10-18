import { describe, expect, it } from 'vitest';
import type { PriorAppraisal } from '@/features/appraisal/api/priorAppraisal';
import { applyCarryForward, rehomeOwnFiles } from './carryForward';
import { mapPriorAppraisalToForm, priorReference } from './mappers';

// The `request` of GET /appraisals/{id}?include=request,documents. Appointment and fee are never in it.
const prior = {
  id: 'prev-1',
  appraisalNumber: '69000002',
  appraisalValue: 1_000_000,
  appraisalDate: '2026-03-14',
  status: 'Completed',
  request: {
    // The picked appraisal's OWN prior book (book 2 -> book 1): never the new request's reference
    prevAppraisal: {
      appraisalId: 'book-1',
      appraisalNumber: '69000001',
      appraisalValue: 1,
      appraisalDate: '2020-01-01',
    },
    detail: {
      hasAppraisalBook: true,
      loanDetail: { bankingSegment: 'SME', facilityLimit: 500 },
      address: null,
      contact: { contactPersonName: 'Somchai' },
    },
    customers: [{ name: 'Customer A', contactNumber: null }],
    properties: [{ propertyType: 'L', sellingPrice: 2_000_000 }],
    titles: [
      {
        id: 't1',
        requestId: 'old-request',
        collateralType: '01',
        titleNumber: '12345',
        documents: [{ id: 'd1', requestId: 'old-request', titleId: 't1', fileName: 'x.pdf' }],
      },
    ],
  },
  documents: [],
} as unknown as PriorAppraisal & { request: NonNullable<PriorAppraisal['request']> };

describe('mapPriorAppraisalToForm', () => {
  it('reads the copy from `request` and stamps the previous-appraisal reference from the HEADER', () => {
    const form = mapPriorAppraisalToForm(prior);
    expect(form.detail).toMatchObject({
      hasAppraisalBook: true,
      prevAppraisalId: 'prev-1',
      prevAppraisalReportNo: '69000002',
      prevAppraisalValue: 1_000_000,
      prevAppraisalDate: '2026-03-14',
    });
    expect(form.detail.loanDetail.bankingSegment).toBe('SME');
    expect(form.detail.contact.contactPersonName).toBe('Somchai');
    expect(form.detail.prevAppraisalId).not.toBe('book-1');
    expect(form.customers).toEqual([{ name: 'Customer A', contactNumber: '' }]);
    expect(form.properties[0]).toMatchObject({ propertyType: 'L', sellingPrice: 2_000_000 });
    expect(form.titles).toHaveLength(1);
    expect(form.titles[0]).toMatchObject({ collateralType: '01', titleNumber: '12345' });
  });

  it('stamps the reference from the header, never from request.prevAppraisal (the picked appraisal\u2019s own prior book)', () => {
    const { detail } = mapPriorAppraisalToForm(prior);
    expect(detail.prevAppraisalId).toBe('prev-1');
    expect(detail.prevAppraisalReportNo).toBe('69000002');
    expect(detail.prevAppraisalValue).toBe(1_000_000);
    expect(detail.prevAppraisalDate).toBe('2026-03-14');
    // a masked value (tracking-only user) stays null rather than falling back to the prior book
    const masked = mapPriorAppraisalToForm({ ...prior, appraisalValue: null });
    expect(masked.detail.prevAppraisalValue).toBeNull();
  });

  it('copies titles as new ones: neither the title\u2019s own id nor the old request\u2019s', () => {
    const [title] = mapPriorAppraisalToForm(prior).titles;
    expect(title).not.toHaveProperty('id');
    expect(title).not.toHaveProperty('requestId');
    // documents are the caller's business (the pick re-homes them, a duplicate empties them)
    expect(title.documents).toHaveLength(1);
  });

  it('carried and rehomed files still reach the right copied title, by key, with no old id on them', () => {
    // the endpoint sends each title with an empty `documents`; the fixture\u2019s one is for the strip test
    const titles = mapPriorAppraisalToForm(prior).titles.map((t: object) => ({
      ...t,
      documents: [],
    }));
    const own = { documentType: 'D013', fileName: 'mine.pdf', documentId: 'own', id: 'row-1' };
    const rehomed = rehomeOwnFiles(
      [{ id: 'form-t', collateralType: '01', titleNumber: '12345', documents: [own as never] }],
      titles,
    );
    expect(rehomed.titleDocuments[0][0]).toMatchObject({
      documentId: 'own',
      titleId: null,
      id: null,
    });
    const carried = {
      documentId: 'carried',
      documentType: 'D013',
      suggestedType: 'D013',
      level: 'Title',
      titleId: 't1',
      collateralType: '01',
      titleNumber: '12345',
      fileName: 'deed.pdf',
      defaultUse: true,
    } as unknown as Parameters<typeof applyCarryForward>[2][number];
    const out = applyCarryForward([], titles, [carried]);
    expect(out.titles[0].documents).toHaveLength(1);
    expect(out.titles[0].documents[0]).toMatchObject({ documentId: 'carried', titleId: null });
  });

  it('priorReference is the header only, with a masked value and a missing date as null', () => {
    expect(priorReference({ ...prior, appraisalValue: null, appraisalDate: null })).toEqual({
      prevAppraisalId: 'prev-1',
      prevAppraisalReportNo: '69000002',
      prevAppraisalValue: null,
      prevAppraisalDate: null,
    });
  });

  it('leaves the inspection round to the display hook', () => {
    expect(mapPriorAppraisalToForm(prior).detail.inspectionNumber).toBeUndefined();
  });

  it('leaves the appointment and fee to the caller, and never reads `documents`', () => {
    const withFiles = { ...prior, documents: [{ documentId: 'x' }] as PriorAppraisal['documents'] };
    const form = mapPriorAppraisalToForm(withFiles);
    expect(form).not.toHaveProperty('documents');
    expect(form.detail).not.toHaveProperty('appointment');
    expect(form.detail).not.toHaveProperty('fee');
  });
});
