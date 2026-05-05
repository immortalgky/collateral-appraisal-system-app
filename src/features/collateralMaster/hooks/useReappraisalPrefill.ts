import { formatLocaleDate } from '@shared/utils/dateUtils';
import type { CollateralMasterDto } from '../api/types';

/**
 * For Reappraisal appraisal start:
 * - Provides locked identity values (read-only — same as dedup key)
 * - Provides editable last-known values (pre-populated from master)
 * - Provides a reference-value label string (shown read-only to avoid anchoring bias)
 *
 * Caller uses `reset()` in RHF to apply these values to the form.
 * Identity fields should be rendered as `disabled` inputs.
 */
export function useReappraisalPrefill(master: CollateralMasterDto | null | undefined) {
  if (!master) {
    return {
      lockedIdentity: null,
      editableLastKnown: null,
      referenceValueLabel: null,
      dataAgeYears: null,
    };
  }

  const land = master.landDetail;
  const condo = master.condoDetail;
  const leasehold = master.leaseholdDetail;
  const machine = master.machineDetail;

  // Compute data age in years (from last appraisal date)
  const lastDate =
    land?.lastAppraisedDate ??
    condo?.lastAppraisedDate ??
    leasehold?.lastAppraisedDate ??
    machine?.lastAppraisedDate;

  const dataAgeYears = lastDate
    ? Math.floor(
        (Date.now() - new Date(lastDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
      )
    : null;

  // Reference value (land uses total)
  const lastValue =
    (land?.lastTotalAppraisedValue ?? land?.lastAppraisedValue) ||
    condo?.lastAppraisedValue ||
    leasehold?.lastAppraisedValue ||
    machine?.lastAppraisedValue;

  const lastAppraisalNo =
    land?.lastAppraisalNumber ??
    condo?.lastAppraisalNumber ??
    leasehold?.lastAppraisalNumber ??
    machine?.lastAppraisalNumber;

  const referenceValueLabel =
    lastValue != null && lastDate
      ? `Previous: ฿${lastValue.toLocaleString('th-TH')} (Appraisal ${lastAppraisalNo ?? '—'} on ${formatLocaleDate(lastDate, 'th')})`
      : null;

  // Locked identity per type
  const lockedIdentity = (() => {
    if (land) {
      return {
        type: 'Land' as const,
        landOfficeCode: land.landOfficeCode,
        province: land.province,
        amphur: land.amphur,
        tambon: land.tambon,
        titleDeedType: land.titleDeedType,
        titleDeedNo: land.titleDeedNo,
        surveyOrParcelNo: land.surveyOrParcelNo ?? undefined,
      };
    }
    if (condo) {
      return {
        type: 'Condo' as const,
        landOfficeCode: condo.landOfficeCode,
        condoRegistrationNumber: condo.condoRegistrationNumber,
        buildingNumber: condo.buildingNumber,
        floorNumber: condo.floorNumber,
        unitNumber: condo.unitNumber,
        titleNumber: condo.titleNumber,
        titleType: condo.titleType,
      };
    }
    if (leasehold) {
      return {
        type: 'Leasehold' as const,
        contractNo: leasehold.leaseRegistrationNo,
        underlyingMasterId: leasehold.underlyingMasterId,
        lessor: leasehold.lessor,
        lessee: leasehold.lessee,
        leaseTermStart: leasehold.leaseTermStart,
      };
    }
    if (machine) {
      return {
        type: 'Machine' as const,
        machineRegistrationNo: machine.machineRegistrationNo ?? undefined,
        serialNo: machine.serialNo ?? undefined,
        brand: machine.brand ?? undefined,
        model: machine.model ?? undefined,
        manufacturer: machine.manufacturer ?? undefined,
      };
    }
    return null;
  })();

  // Editable last-known fields per type
  const editableLastKnown = (() => {
    if (land) {
      return {
        ownerName: master.ownerName,
        street: land.street,
        village: land.village,
        postalCode: land.postalCode,
        latitude: land.latitude,
        longitude: land.longitude,
        landShapeType: land.landShapeType,
        landZoneType: land.landZoneType,
        urbanPlanningType: land.urbanPlanningType,
        accessRoadWidth: land.accessRoadWidth,
        roadFrontage: land.roadFrontage,
        landArea: land.landArea,
      };
    }
    if (condo) {
      return {
        ownerName: master.ownerName,
        condoName: condo.condoName,
        province: condo.province,
        usableArea: condo.usableArea,
        locationType: condo.locationType,
        buildingAge: condo.buildingAge,
        constructionYear: condo.constructionYear,
        modelName: condo.modelName,
      };
    }
    if (leasehold) {
      return {
        ownerName: master.ownerName,
        leaseTermEnd: leasehold.leaseTermEnd,
        leaseTermMonths: leasehold.leaseTermMonths,
        annualRent: leasehold.annualRent,
        leasePurpose: leasehold.leasePurpose,
      };
    }
    if (machine) {
      return {
        ownerName: master.ownerName,
        engineNo: machine.engineNo,
        chassisNo: machine.chassisNo,
        yearOfManufacture: machine.yearOfManufacture,
        machineCondition: machine.machineCondition,
        machineAge: machine.machineAge,
      };
    }
    return null;
  })();

  return {
    lockedIdentity,
    editableLastKnown,
    referenceValueLabel,
    dataAgeYears,
  };
}
