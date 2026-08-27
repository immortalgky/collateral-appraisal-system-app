import { describe, expect, it } from 'vitest';
import { buildCorrectionRequest, hasRealChanges, sectionsForType } from './toCorrectionRequest';
import { buildDiffRows } from './diffRows';
import { getPropertyTypeForm } from '../configs/propertyTypeForms';

describe('sectionsForType', () => {
  it('resolves every property type the correction screen offers', () => {
    for (const type of ['L', 'B', 'LB', 'U', 'MAC', 'VEH', 'VES', 'LSL', 'LSB', 'LS', 'LSU']) {
      expect({ type, sections: sectionsForType(type).length > 0 }).toEqual({
        type,
        sections: true,
      });
      expect({ type, form: Boolean(getPropertyTypeForm(type)) }).toEqual({ type, form: true });
    }
  });
});

describe('buildCorrectionRequest', () => {
  it('sends only dirty fields, grouped into their DTO section', () => {
    const body = buildCorrectionRequest(
      'L',
      'typo in the deed',
      { ownerNameLand: true },
      { ownerNameLand: 'สมชาย ใจดี', landDescription: 'untouched' },
    );

    expect(body).toEqual({ reason: 'typo in the deed', land: { ownerName: 'สมชาย ใจดี' } });
  });

  it('splits owner fields to the right detail on land-and-building', () => {
    const body = buildCorrectionRequest(
      'LB',
      'both owners wrong',
      { ownerNameLand: true, ownerNameBuilding: true },
      { ownerNameLand: 'ที่ดิน', ownerNameBuilding: 'สิ่งปลูกสร้าง' },
    );

    expect(body).toEqual({
      reason: 'both owners wrong',
      land: { ownerName: 'ที่ดิน' },
      building: { ownerName: 'สิ่งปลูกสร้าง' },
    });
  });

  it('sends address codes and never the display names beside them', () => {
    const body = buildCorrectionRequest(
      'L',
      'wrong sub-district',
      { subDistrict: true, district: true, districtName: true, province: true, provinceName: true },
      {
        subDistrict: '100701',
        district: '1007',
        districtName: 'คลองสาน',
        province: '10',
        provinceName: 'กรุงเทพมหานคร',
      },
    );

    expect(body).toEqual({
      reason: 'wrong sub-district',
      land: { subDistrict: '100701', district: '1007', province: '10' },
    });
  });

  it('re-attaches the row id to every touched land title', () => {
    const body = buildCorrectionRequest(
      'L',
      'deed number transposed',
      { titles: [undefined, { titleNumber: true }] },
      {
        titles: [
          { id: 'title-1', titleNumber: '1111' },
          { id: 'title-2', titleNumber: '2222' },
        ],
      },
    );

    expect(body.landTitles).toEqual([{ titleId: 'title-2', titleNumber: '2222' }]);
  });

  it('keeps the lease block under its own section', () => {
    const body = buildCorrectionRequest(
      'LSL',
      'lessee misspelled',
      { leaseAgreement: { lesseeName: true } },
      { leaseAgreement: { lesseeName: 'บริษัท ก' } },
    );

    expect(body).toEqual({
      reason: 'lessee misspelled',
      leaseAgreement: { lesseeName: 'บริษัท ก' },
    });
  });

  it('carries an explicit clear through, since the API reads "" as "erase this"', () => {
    const body = buildCorrectionRequest(
      'L',
      'remark no longer applies',
      { remark: true },
      { remark: '' },
    );

    expect(body).toEqual({ reason: 'remark no longer applies', land: { remark: '' } });
  });

  it('reports a reason-only edit as no change', () => {
    expect(hasRealChanges(buildCorrectionRequest('L', 'oops', {}, {}))).toBe(false);
  });
});

describe('buildDiffRows', () => {
  it('reads "from" out of the defaults, not out of the submitted values', () => {
    const rows = buildDiffRows(
      { reason: 'r', land: { ownerName: 'ชื่อใหม่' } },
      { ownerNameLand: 'ชื่อเดิม' },
      { ownerNameLand: 'ชื่อใหม่' },
    );

    expect(rows).toEqual([
      { field: 'land.ownerName', label: 'Owner', from: 'ชื่อเดิม', to: 'ชื่อใหม่' },
    ]);
  });

  it('shows readable address names even though codes are what get sent', () => {
    const rows = buildDiffRows(
      { reason: 'r', land: { district: '1007' } },
      { districtName: 'บางรัก' },
      { districtName: 'คลองสาน' },
    );

    expect(rows[0].from).toBe('บางรัก');
    expect(rows[0].to).toBe('คลองสาน');
  });

  it('numbers land-title rows so two deeds are told apart', () => {
    const rows = buildDiffRows(
      { reason: 'r', landTitles: [{ titleId: 'title-2', titleNumber: '2222' }] },
      {
        titles: [
          { id: 'title-1', titleNumber: '1111' },
          { id: 'title-2', titleNumber: '9999' },
        ],
      },
      {},
    );

    expect(rows).toEqual([
      {
        field: 'titles.0.titleNumber',
        label: expect.stringContaining('(1)'),
        from: '9999',
        to: '2222',
      },
    ]);
  });
});

describe('land title rows survive the edit modal', () => {
  // The modal validates with a zod object schema, which strips keys it does not declare —
  // and the row's `id` is not a field config. Before the fix the id was lost on save, the
  // row could not be identified, and the whole correction was dropped with a success toast.
  it('takes titleId from the record when the submitted row has lost its id', () => {
    const body = buildCorrectionRequest(
      'L',
      'deed number transposed',
      { titles: [{ titleNumber: true }] },
      { titles: [{ titleNumber: '2222' }] }, // no id — stripped by the modal's schema
      { titles: [{ id: 'title-1', titleNumber: '1111' }] },
    );

    expect(body.landTitles).toEqual([{ titleId: 'title-1', titleNumber: '2222' }]);
  });

  it('drops title columns that are not correction members', () => {
    const body = buildCorrectionRequest(
      'L',
      'only the deed number changed',
      { titles: [{ titleNumber: true, rai: true, ngan: true, squareWa: true }] },
      { titles: [{ id: 't1', titleNumber: '2222', rai: 0, ngan: 0, squareWa: 0 }] },
      { titles: [{ id: 't1', titleNumber: '1111', rai: null, ngan: null, squareWa: null }] },
    );

    expect(body.landTitles).toEqual([{ titleId: 't1', titleNumber: '2222' }]);
  });
});
