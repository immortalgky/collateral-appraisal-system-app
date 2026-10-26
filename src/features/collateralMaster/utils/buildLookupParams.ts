import { mapCollateral } from '@/features/request/data/mapCollateral';
import { titleFamily, type TitleFamily } from '@/features/request/utils/titleList';
import type { CollateralLookupParams } from '../api/types';

// The title form's collateralType is the 33-code CollateralType parameter ('01'..'33'), not the
// backend's CollateralTypes vocabulary. The lookup treats L/LB alike, so the form's own family
// (titleFamily) is enough. Lease codes are left out: a leasehold master is keyed by its contract,
// lessor, lessee and underlying master, none of which the title form has.
const LEASE_CODES = new Set([...mapCollateral.LS, ...mapCollateral.LSU]);
const LOOKUP_TYPE: Partial<Record<TitleFamily, 'L' | 'LB' | 'U' | 'MAC'>> = {
  land: 'L',
  landBuilding: 'LB',
  condo: 'U',
  machine: 'MAC',
};

export interface TitleLookupFields {
  titleNumber: string;
  province: string;
  district: string;
  subDistrict: string;
  condoRegistrationNumber: string;
  buildingNumber: string;
  floorNumber: string;
  roomNumber: string;
  registrationNo: string;
}

/** A blank or "-" (the placeholder copied from priors) is no value: the key is incomplete. */
const real = (v: string | undefined) => {
  const t = v?.trim();
  return !t || t === '-' ? '' : t;
};

export function buildLookupParams(
  collateralType: string,
  rawFields: TitleLookupFields,
): CollateralLookupParams | null {
  const fields = Object.fromEntries(
    Object.entries(rawFields).map(([k, v]) => [k, real(v)]),
  ) as unknown as TitleLookupFields;
  const type = LEASE_CODES.has(collateralType)
    ? undefined
    : LOOKUP_TYPE[titleFamily(collateralType)];
  switch (type) {
    case 'L':
    case 'LB': {
      // The backend's land identity: province + district + subDistrict + titleNumber
      const { titleNumber, province, district, subDistrict } = fields;
      if (!titleNumber || !province || !district || !subDistrict) return null;
      return { type, titleNumber, province, district, subDistrict };
    }
    case 'U': {
      // Condo identity: registration number + building + floor + room, within the same geography
      const { condoRegistrationNumber, buildingNumber, floorNumber, roomNumber } = fields;
      const { province, district, subDistrict } = fields;
      if (!condoRegistrationNumber || !buildingNumber || !floorNumber || !roomNumber) return null;
      if (!province || !district || !subDistrict) return null;
      return {
        type,
        condoRegistrationNumber,
        building: buildingNumber,
        floor: floorNumber,
        unit: roomNumber,
        province,
        district,
        subDistrict,
      };
    }
    case 'MAC':
      return fields.registrationNo ? { type, machineRegistrationNo: fields.registrationNo } : null;
    default:
      return null;
  }
}
