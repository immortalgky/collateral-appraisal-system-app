import { describe, expect, it, vi } from 'vitest';
import { buildLookupParams, type TitleLookupFields } from './buildLookupParams';
import { lookupCollateralMasterOptions } from '../api/hooks';

const get = vi.hoisted(() => vi.fn());
vi.mock('@shared/api/axiosInstance', () => ({ default: { get } }));

const empty: TitleLookupFields = {
  titleNumber: '',
  province: '',
  district: '',
  subDistrict: '',
  condoRegistrationNumber: '',
  buildingNumber: '',
  floorNumber: '',
  roomNumber: '',
  registrationNo: '',
};
const land = {
  ...empty,
  titleNumber: '1234',
  province: '10',
  district: '1001',
  subDistrict: '100101',
};
const condo = {
  ...land,
  titleNumber: '',
  condoRegistrationNumber: 'REG-1',
  buildingNumber: 'A',
  floorNumber: '3',
  roomNumber: '301',
};

describe('buildLookupParams', () => {
  it('builds the backend land key from the form codes', () => {
    expect(buildLookupParams('01', land)).toEqual({
      type: 'L',
      titleNumber: '1234',
      province: '10',
      district: '1001',
      subDistrict: '100101',
    });
    expect(buildLookupParams('02', land)?.type).toBe('LB');
  });

  it('builds the backend condo key', () => {
    expect(buildLookupParams('08', condo)).toEqual({
      type: 'U',
      condoRegistrationNumber: 'REG-1',
      building: 'A',
      floor: '3',
      unit: '301',
      province: '10',
      district: '1001',
      subDistrict: '100101',
    });
  });

  it('skips incomplete keys, leasehold and untyped titles', () => {
    expect(buildLookupParams('01', { ...land, subDistrict: '' })).toBeNull();
    expect(buildLookupParams('08', { ...condo, roomNumber: '' })).toBeNull();
    expect(buildLookupParams('08', { ...condo, subDistrict: '' })).toBeNull();
    expect(buildLookupParams('29', land)).toBeNull();
    expect(buildLookupParams('28', condo)).toBeNull();
    expect(buildLookupParams('', land)).toBeNull();
  });
});

describe('buildLookupParams placeholders', () => {
  it.each(['', '-', '  -  ', '   '])('reads %j as a missing key value', blank => {
    expect(buildLookupParams('01', { ...land, titleNumber: blank })).toBeNull();
    expect(buildLookupParams('08', { ...condo, condoRegistrationNumber: blank })).toBeNull();
    expect(buildLookupParams('08', { ...condo, buildingNumber: blank })).toBeNull();
    expect(buildLookupParams('08', { ...condo, floorNumber: blank })).toBeNull();
    expect(buildLookupParams('08', { ...condo, roomNumber: blank })).toBeNull();
    expect(buildLookupParams('08', { ...condo, subDistrict: blank })).toBeNull();
    expect(buildLookupParams('11', { ...empty, registrationNo: blank })).toBeNull();
  });

  it('trims a real value', () => {
    expect(buildLookupParams('01', { ...land, titleNumber: ' 1234 ' })).toMatchObject({
      titleNumber: '1234',
    });
  });

  it('still builds from a real value, including one that contains a dash', () => {
    expect(buildLookupParams('01', { ...land, titleNumber: '12-3' })).toMatchObject({
      titleNumber: '12-3',
    });
    expect(buildLookupParams('11', { ...empty, registrationNo: 'M-1' })).toEqual({
      type: 'MAC',
      machineRegistrationNo: 'M-1',
    });
  });
});

describe('lookupCollateralMasterOptions', () => {
  const params = () => buildLookupParams('02', land)!;

  it('sends the type code and the backend param names', async () => {
    get.mockResolvedValue({ data: { id: 'm1' } });
    await expect(lookupCollateralMasterOptions(params()).queryFn()).resolves.toEqual({ id: 'm1' });
    expect(get).toHaveBeenCalledWith('/collateral-masters/lookup', {
      params: {
        type: 'LB',
        titleNumber: '1234',
        province: '10',
        district: '1001',
        subDistrict: '100101',
      },
    });
  });

  it('reads a 404 as a miss, and lets any other error through', async () => {
    get.mockRejectedValue({ response: { status: 404 } });
    await expect(lookupCollateralMasterOptions(params()).queryFn()).resolves.toBeNull();
    get.mockRejectedValue(new Error('boom'));
    await expect(lookupCollateralMasterOptions(params()).queryFn()).rejects.toThrow('boom');
  });
});
