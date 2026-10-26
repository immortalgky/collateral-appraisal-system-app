import { beforeEach, describe, expect, it } from 'vitest';
import { useAddressStore } from '@/shared/store';
import type { BriefAsset } from '../api/appraisalBrief';
import { assetPlaces, dopaPlace, placeOf } from './places';

const row = (district: string) => ({
  provinceCode: '10',
  provinceName: 'กรุงเทพมหานคร',
  districtCode: '1001',
  districtName: district,
  subDistrictCode: '100101',
  subDistrictName: 'ก',
  postcode: '10000',
});

beforeEach(() => {
  // The same code names a different district in the two masters.
  useAddressStore.setState({
    titleAddresses: [row('พระโขนง')],
    dopaAddresses: [row('ประเวศ')],
  });
});

describe('places', () => {
  it('names a property by its DOPA names when the brief sends them', () => {
    const a = { location: '100101', dopaDistrictName: 'บางนา' } as BriefAsset;
    expect(dopaPlace(a)?.district).toBe('บางนา');
  });

  it('resolves the deed geocode of an older brief in the Title master, not in DOPA', () => {
    expect(dopaPlace({ location: '100101' } as BriefAsset)?.district).toBe('พระโขนง');
  });

  it('resolves a project code in the DOPA master', () => {
    expect(placeOf({}, '100101')?.district).toBe('ประเวศ');
  });

  it('looks a geocode up once however many properties share it', () => {
    let reads = 0;
    const titles = new Proxy([row('พระโขนง')], {
      get(target, prop, receiver) {
        if (prop === 'find') reads++;
        return Reflect.get(target, prop, receiver);
      },
    });
    useAddressStore.setState({ titleAddresses: titles });
    const assets = Array.from({ length: 50 }, () => ({ location: '100101' }) as BriefAsset);
    const places = assetPlaces(assets);
    expect(places.every(p => p?.district === 'พระโขนง')).toBe(true);
    expect(reads).toBe(1);
  });

  it('shows a location that is not a geocode as text, and says nothing for an unresolved geocode', () => {
    expect(dopaPlace({ location: 'บางนา' } as BriefAsset)?.subDistrict).toBe('บางนา');
    expect(dopaPlace({ location: '999999' } as BriefAsset)).toBeNull();
  });
});
