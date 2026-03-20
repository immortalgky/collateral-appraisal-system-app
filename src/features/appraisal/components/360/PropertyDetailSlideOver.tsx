import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import axios from '@shared/api/axiosInstance';
import Icon from '@/shared/components/Icon';
import type { PropertyType } from '../../types';

interface PropertyDetailSlideOverProps {
  appraisalId: string;
  propertyId: string;
  propertyType: PropertyType;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Map each PropertyType to its API detail path and query key segment.
 * Matches the existing hooks in `api/property.ts`:
 *   - land-detail, building-detail, condo-detail, land-and-building-detail, machinery-detail
 */
const LAND_CONFIG = { detailPath: 'land-detail', queryKey: 'land-properties' };
const BUILDING_CONFIG = { detailPath: 'building-detail', queryKey: 'building-properties' };
const CONDO_CONFIG = { detailPath: 'condo-detail', queryKey: 'condo-properties' };
const LAND_BUILDING_CONFIG = { detailPath: 'land-and-building-detail', queryKey: 'land-and-building-properties' };
const MACHINERY_CONFIG = { detailPath: 'machinery-detail', queryKey: 'machinery-properties' };

const PROPERTY_TYPE_CONFIG: Record<string, { detailPath: string; queryKey: string }> = {
  // Full names (from PropertyType enum)
  Lands: LAND_CONFIG,
  Building: BUILDING_CONFIG,
  Condominium: CONDO_CONFIG,
  'Land and building': LAND_BUILDING_CONFIG,
  'Lease Agreement Lands': LAND_CONFIG,
  'Lease Agreement Building': BUILDING_CONFIG,
  'Lease Agreement Land and building': LAND_BUILDING_CONFIG,
  Machine: MACHINERY_CONFIG,
  Vehicle: MACHINERY_CONFIG,
  Vessel: MACHINERY_CONFIG,
  // Short codes (from API propertyType field)
  L: LAND_CONFIG,
  B: BUILDING_CONFIG,
  U: CONDO_CONFIG,
  LB: LAND_BUILDING_CONFIG,
  M: MACHINERY_CONFIG,
};

const DEFAULT_CONFIG = { detailPath: 'land-detail', queryKey: 'land-properties' };

/**
 * Key fields to show for each property type in structured sections.
 * These map to the actual API response fields from the schemas.
 */
const LAND_FIELDS: FieldDef[] = [
  { key: 'ownerName', label: 'Owner' },
  { key: 'street', label: 'Street' },
  { key: 'soi', label: 'Soi' },
  { key: 'village', label: 'Village' },
  { key: 'landOffice', label: 'Land Office' },
  { key: 'landShapeType', label: 'Land Shape' },
  { key: 'urbanPlanningType', label: 'Urban Planning' },
  { key: 'landFillType', label: 'Land Fill' },
  { key: 'landFillPercent', label: 'Land Fill %' },
  { key: 'accessRoadWidth', label: 'Access Road Width (m)' },
  { key: 'roadFrontage', label: 'Road Frontage (m)' },
  { key: 'roadSurfaceType', label: 'Road Surface' },
  { key: 'landAccessibilityType', label: 'Accessibility' },
  { key: 'propertyAnticipationType', label: 'Anticipation' },
  { key: 'isOwnerVerified', label: 'Owner Verified', isBoolean: true },
  { key: 'hasObligation', label: 'Has Obligation', isBoolean: true },
  { key: 'isExpropriated', label: 'Expropriated', isBoolean: true },
  { key: 'isEncroached', label: 'Encroached', isBoolean: true },
  { key: 'remark', label: 'Remark' },
];

const BUILDING_FIELDS: FieldDef[] = [
  { key: 'ownerName', label: 'Owner' },
  { key: 'buildingNumber', label: 'Building No.' },
  { key: 'buildingName', label: 'Building Name' },
  { key: 'buildingType', label: 'Building Type' },
  { key: 'buildingStructure', label: 'Structure' },
  { key: 'numberOfFloors', label: 'Floors' },
  { key: 'buildingAge', label: 'Building Age (yrs)' },
  { key: 'buildingCondition', label: 'Condition' },
  { key: 'totalUsableArea', label: 'Usable Area (sq.m.)' },
  { key: 'buildingPermitNumber', label: 'Permit No.' },
  { key: 'remark', label: 'Remark' },
];

const CONDO_FIELDS: FieldDef[] = [
  { key: 'ownerName', label: 'Owner' },
  { key: 'projectName', label: 'Project Name' },
  { key: 'unitNumber', label: 'Unit No.' },
  { key: 'floor', label: 'Floor' },
  { key: 'building', label: 'Building' },
  { key: 'roomType', label: 'Room Type' },
  { key: 'totalUsableArea', label: 'Usable Area (sq.m.)' },
  { key: 'direction', label: 'Direction' },
  { key: 'condoAge', label: 'Age (yrs)' },
  { key: 'condoCondition', label: 'Condition' },
  { key: 'parkingSlots', label: 'Parking Slots' },
  { key: 'remark', label: 'Remark' },
];

const LAND_BUILDING_FIELDS: FieldDef[] = [
  ...LAND_FIELDS.filter(f => !['remark'].includes(f.key)),
  ...BUILDING_FIELDS.filter(f => !['ownerName', 'remark'].includes(f.key)),
  { key: 'remark', label: 'Remark' },
];

const MACHINERY_FIELDS: FieldDef[] = [
  { key: 'ownerName', label: 'Owner' },
  { key: 'machineryName', label: 'Name' },
  { key: 'machineryType', label: 'Type' },
  { key: 'brand', label: 'Brand' },
  { key: 'model', label: 'Model' },
  { key: 'serialNumber', label: 'Serial No.' },
  { key: 'manufactureYear', label: 'Manufacture Year' },
  { key: 'condition', label: 'Condition' },
  { key: 'registrationNo', label: 'Registration No.' },
  { key: 'remark', label: 'Remark' },
];

interface FieldDef {
  key: string;
  label: string;
  isBoolean?: boolean;
}

function getFieldsForType(propertyType: string): FieldDef[] {
  const config = PROPERTY_TYPE_CONFIG[propertyType];
  if (!config) return LAND_FIELDS;

  switch (config.queryKey) {
    case 'land-and-building-properties': return LAND_BUILDING_FIELDS;
    case 'building-properties': return BUILDING_FIELDS;
    case 'condo-properties': return CONDO_FIELDS;
    case 'machinery-properties': return MACHINERY_FIELDS;
    case 'land-properties':
    default: return LAND_FIELDS;
  }
}

const PropertyDetailSlideOver = ({
  appraisalId,
  propertyId,
  propertyType,
}: PropertyDetailSlideOverProps) => {
  const config = PROPERTY_TYPE_CONFIG[propertyType] || DEFAULT_CONFIG;

  // Use the same query key pattern as existing hooks in api/property.ts
  const { data, isLoading, error } = useQuery({
    queryKey: ['appraisals', appraisalId, config.queryKey, propertyId],
    queryFn: async () => {
      const { data } = await axios.get(
        `/appraisals/${appraisalId}/properties/${propertyId}/${config.detailPath}`,
      );
      return data;
    },
    enabled: !!appraisalId && !!propertyId,
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 404) return false;
      return failureCount < 3;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icon name="spinner" style="solid" className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <Icon name="circle-exclamation" style="solid" className="w-6 h-6 text-red-400" />
        <p className="text-sm text-red-600">Failed to load property details.</p>
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-gray-500 py-4">No detail data available.</p>;
  }

  // Photos from the property detail response
  const photos: any[] = data.photos ?? data.documents ?? [];
  const photoUrls = photos
    .filter((p: any) => p.documentId)
    .map((p: any) => `${API_BASE_URL}/documents/${p.documentId}/download?download=false&size=large`);

  // Title deeds (land types have a `titles` array)
  const titles: any[] = data.titles ?? [];

  const fields = getFieldsForType(propertyType);

  return (
    <div className="space-y-6">
      {/* Photos */}
      {photoUrls.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Photos</h4>
          <div className="grid grid-cols-2 gap-2">
            {photoUrls.slice(0, 4).map((url: string, idx: number) => (
              <div
                key={idx}
                className="aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200"
              >
                <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
          {photoUrls.length > 4 && (
            <p className="text-xs text-gray-400 mt-1">+{photoUrls.length - 4} more photos</p>
          )}
        </div>
      )}

      {/* General Information */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">General Information</h4>
        <div className="space-y-0">
          <DetailRow label="Property Type" value={propertyType} />
          <DetailRow label="Name / Address" value={data.propertyName ?? data.projectName} />
          <DetailRow label="Latitude" value={data.latitude} />
          <DetailRow label="Longitude" value={data.longitude} />
          <DetailRow
            label="Location"
            value={[data.subDistrictName ?? data.subDistrict, data.districtName ?? data.district, data.provinceName ?? data.province]
              .filter(Boolean)
              .join(', ') || undefined}
          />
        </div>
      </div>

      {/* Title Deeds (for land types) */}
      {titles.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Title Deeds ({titles.length})
          </h4>
          <div className="space-y-3">
            {titles.map((title: any, idx: number) => (
              <TitleDeedCard key={idx} title={title} idx={idx} />
            ))}
          </div>
        </div>
      )}

      {/* Type-specific fields */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Details</h4>
        <div className="space-y-0">
          {fields.map(field => {
            const value = data[field.key];
            if (value == null || value === '') return null;

            let display: string;
            if (field.isBoolean) {
              display = value ? 'Yes' : 'No';
            } else if (Array.isArray(value)) {
              display = value.join(', ');
            } else {
              display = String(value);
            }

            return <DetailRow key={field.key} label={field.label} value={display} />;
          })}
        </div>
      </div>
    </div>
  );
};

const TitleDeedCard = ({ title, idx }: { title: any; idx: number }) => {
  const titleName = title.titleNumber || `Title ${idx + 1}`;

  // Build area string: e.g. "1-2-50.00" (Rai-Ngan-Sq.Wa)
  const areaParts: string[] = [];
  if (title.rai != null) areaParts.push(String(title.rai));
  if (title.ngan != null) areaParts.push(String(title.ngan));
  if (title.squareWa != null) areaParts.push(String(title.squareWa));
  const areaStr = areaParts.length > 0 ? areaParts.join('-') : null;

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="file-contract" style="solid" className="w-3.5 h-3.5 text-teal-500" />
          <span className="text-sm font-semibold text-gray-900">{titleName}</span>
        </div>
        {title.titleType && (
          <span className="text-[10px] font-medium text-gray-500 px-1.5 py-0.5 rounded bg-gray-200 uppercase">
            {title.titleType}
          </span>
        )}
      </div>
      {/* Body */}
      <div className="px-4 py-2.5 space-y-0 text-xs">
        {title.bookNumber && (
          <div className="flex justify-between py-1 border-b border-gray-50">
            <span className="text-gray-500">Book No.</span>
            <span className="text-gray-900">{title.bookNumber}</span>
          </div>
        )}
        {title.pageNumber && (
          <div className="flex justify-between py-1 border-b border-gray-50">
            <span className="text-gray-500">Page No.</span>
            <span className="text-gray-900">{title.pageNumber}</span>
          </div>
        )}
        {title.rawang && (
          <div className="flex justify-between py-1 border-b border-gray-50">
            <span className="text-gray-500">Rawang</span>
            <span className="text-gray-900">{title.rawang}</span>
          </div>
        )}
        {title.landNumber && (
          <div className="flex justify-between py-1 border-b border-gray-50">
            <span className="text-gray-500">Land No.</span>
            <span className="text-gray-900">{title.landNumber}</span>
          </div>
        )}
        {title.surveyNumber && (
          <div className="flex justify-between py-1 border-b border-gray-50">
            <span className="text-gray-500">Survey No.</span>
            <span className="text-gray-900">{title.surveyNumber}</span>
          </div>
        )}
        {title.sheetNumber && (
          <div className="flex justify-between py-1 border-b border-gray-50">
            <span className="text-gray-500">Sheet No.</span>
            <span className="text-gray-900">{title.sheetNumber}</span>
          </div>
        )}
        {areaStr && (
          <div className="flex justify-between py-1 border-b border-gray-50">
            <span className="text-gray-500">Area (Rai-Ngan-Sq.Wa)</span>
            <span className="text-gray-900 font-medium">{areaStr}</span>
          </div>
        )}
        {title.governmentPricePerSqWa != null && (
          <div className="flex justify-between py-1 border-b border-gray-50">
            <span className="text-gray-500">Gov. Price / Sq.Wa</span>
            <span className="text-gray-900">{Number(title.governmentPricePerSqWa).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        )}
        {title.governmentPrice != null && (
          <div className="flex justify-between py-1 border-b border-gray-50">
            <span className="text-gray-500">Gov. Price</span>
            <span className="text-gray-900 font-medium">{Number(title.governmentPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        )}
        {title.isMissingFromSurvey != null && (
          <div className="flex justify-between py-1">
            <span className="text-gray-500">Missed on Survey</span>
            <span className={title.isMissingFromSurvey ? 'text-amber-600 font-medium' : 'text-gray-900'}>
              {title.isMissingFromSurvey ? 'Yes' : 'No'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const DetailRow = ({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) => (
  <div className="flex justify-between py-1.5 border-b border-gray-50">
    <span className="text-xs text-gray-500 shrink-0">{label}</span>
    <span className="text-sm text-gray-900 text-right max-w-[60%] truncate ml-4">
      {value != null && value !== '' ? String(value) : '-'}
    </span>
  </div>
);

export default PropertyDetailSlideOver;
