import { useEffect, useRef, useState } from 'react';
import { useWatch, useFormContext } from 'react-hook-form';
import { CollateralLookupBanner } from './CollateralLookupBanner';
import { useCollateralLookup } from './CollateralLookupContext';
import { useLookupCollateralMaster } from '../api/hooks';
import { useAppealExclusionStore } from '../store/appealExclusionStore';
import { useCollateralPrefillStore } from '../store/collateralPrefillStore';
import type { CollateralLookupParams } from '../api/types';

interface TitleLookupIntegrationProps {
  /** Index of this title in the `titles` field array */
  titleIndex: number;
}

/**
 * Mounted inside the title detail view (TitleInformationForm).
 * Watches collateral-type-specific identity fields via useWatch,
 * debounces lookup, and renders the "previously appraised" banner.
 *
 * When "Use prior data" is clicked the form values are prefilled using setValue.
 * Identity fields are NOT locked here — locking is handled by the appraisal start flow.
 */
export function TitleLookupIntegration({ titleIndex }: TitleLookupIntegrationProps) {
  const { setValue } = useFormContext();
  const { setLookupResult } = useCollateralLookup();
  const setExcludedCompanyId = useAppealExclusionStore(s => s.setExcludedCompanyId);
  const setLastConstructionInspectionId = useCollateralPrefillStore(
    s => s.setLastConstructionInspectionId,
  );

  const prefix = `titles.${titleIndex}`;

  // Watch the collateral type selector
  const collateralType: string = useWatch({ name: `${prefix}.collateralType` }) ?? '';

  // Watch identity fields (all types — only active one will be non-empty)
  const titleNumber: string = useWatch({ name: `${prefix}.titleNumber` }) ?? '';
  const titleType: string = useWatch({ name: `${prefix}.titleType` }) ?? '';
  const province: string = useWatch({ name: `${prefix}.titleAddress.provinceName` }) ?? '';

  // Machine fields
  const registrationNo: string = useWatch({ name: `${prefix}.registrationNo` }) ?? '';

  // Debounced params
  const [lookupParams, setLookupParams] = useState<CollateralLookupParams | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Banner dismiss state
  const [dismissed, setDismissed] = useState(false);

  // Reset dismiss when identity fields change
  const identityKey = `${collateralType}|${titleNumber}|${province}|${registrationNo}`;
  const prevIdentityKeyRef = useRef(identityKey);
  if (prevIdentityKeyRef.current !== identityKey) {
    prevIdentityKeyRef.current = identityKey;
    setDismissed(false);
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const params = buildLookupParams(collateralType, {
        titleNumber,
        titleType,
        province,
        registrationNo,
      });
      setLookupParams(params);
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [collateralType, titleNumber, titleType, province, registrationNo]);

  const { data: lookupResult } = useLookupCollateralMaster(lookupParams, !dismissed);

  // Push result to context and stores for downstream consumption
  useEffect(() => {
    setLookupResult(lookupResult ?? null);

    // Appeal exclusion: most-recent prior company id only (per business rule)
    setExcludedCompanyId(lookupResult?.lastEngagement?.appraisalCompanyId ?? null);

    // Progressive prefill: last construction inspection ID (Land only)
    const inspectionId =
      lookupResult?.master?.collateralType === 'Land'
        ? (lookupResult.master.landDetail?.lastConstructionInspectionId ?? null)
        : null;
    setLastConstructionInspectionId(inspectionId);
  }, [lookupResult, setLookupResult, setExcludedCompanyId, setLastConstructionInspectionId]);

  const handleUsePriorData = () => {
    if (!lookupResult) return;
    const { master } = lookupResult;

    // Prefill owner
    if (master.ownerName) {
      setValue(`${prefix}.ownerName`, master.ownerName, { shouldDirty: true });
    }

    // Land prefill
    if (master.collateralType === 'Land' && master.landDetail) {
      const d = master.landDetail;
      setValue(`${prefix}.titleNumber`, d.titleDeedNo, { shouldDirty: true });
      setValue(`${prefix}.titleType`, d.titleDeedType, { shouldDirty: true });
      if (d.landArea) setValue(`${prefix}.areaSquareWa`, d.landArea, { shouldDirty: true });
    }

    // Condo prefill
    if (master.collateralType === 'Condo' && master.condoDetail) {
      const d = master.condoDetail;
      setValue(`${prefix}.titleNumber`, d.titleNumber, { shouldDirty: true });
      setValue(`${prefix}.titleType`, d.titleType, { shouldDirty: true });
      setValue(`${prefix}.condoName`, d.condoName ?? '', { shouldDirty: true });
      setValue(`${prefix}.buildingNumber`, d.buildingNumber, { shouldDirty: true });
      setValue(`${prefix}.floorNumber`, d.floorNumber, { shouldDirty: true });
      setValue(`${prefix}.roomNumber`, d.unitNumber, { shouldDirty: true });
      if (d.usableArea) setValue(`${prefix}.usableArea`, d.usableArea, { shouldDirty: true });
    }

    // Machine prefill
    if (master.collateralType === 'Machine' && master.machineDetail) {
      const d = master.machineDetail;
      if (d.machineRegistrationNo) {
        setValue(`${prefix}.registrationNo`, d.machineRegistrationNo, { shouldDirty: true });
      }
    }

    setDismissed(true);
  };

  if (!lookupResult || dismissed) return null;

  return (
    <CollateralLookupBanner
      result={lookupResult}
      onUsePriorData={handleUsePriorData}
      onDismiss={() => setDismissed(true)}
    />
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildLookupParams(
  collateralType: string,
  fields: {
    titleNumber: string;
    titleType: string;
    province: string;
    registrationNo: string;
  },
): CollateralLookupParams | null {
  // Map request-form collateral types to collateral master types
  switch (collateralType) {
    case 'L':
    case 'LB':
    case 'LSL':
    case 'LS': {
      if (!fields.titleNumber || !fields.province) return null;
      return {
        type: 'Land',
        titleDeedNo: fields.titleNumber,
        titleDeedType: fields.titleType || undefined,
        province: fields.province || undefined,
      };
    }
    case 'U': {
      if (!fields.titleNumber) return null;
      return {
        type: 'Condo',
        titleNumber: fields.titleNumber,
        titleType: fields.titleType || undefined,
      };
    }
    case 'MAC': {
      if (!fields.registrationNo) return null;
      return {
        type: 'Machine',
        machineRegistrationNo: fields.registrationNo || undefined,
      };
    }
    default:
      return null;
  }
}

export default TitleLookupIntegration;
