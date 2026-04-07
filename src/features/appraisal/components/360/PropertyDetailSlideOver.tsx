import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import axios from '@shared/api/axiosInstance';
import Icon from '@/shared/components/Icon';
import ParameterDisplay from '@/shared/components/ParameterDisplay';
import type { PropertyType } from '../../types';
import { getSectionsForType, type FieldDef } from './propertyDetailFieldConfigs';
import { getDetailEndpoint } from '../../utils/propertyTypeConfig';

interface PropertyDetailSlideOverProps {
  appraisalId: string;
  propertyId: string;
  propertyType: PropertyType;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function getConfig(propertyType: string) {
  const detailPath = getDetailEndpoint(propertyType) ?? 'land-detail';
  const queryKey = detailPath.replace('-detail', '-properties');
  return { detailPath, queryKey };
}

function formatNumber(value: unknown, decimalPlaces?: number): string {
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return num.toLocaleString(undefined, {
    minimumFractionDigits: decimalPlaces ?? 0,
    maximumFractionDigits: decimalPlaces ?? 2,
  });
}

function formatDate(value: unknown): string {
  if (!value) return '';
  const d = new Date(String(value));
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString();
}

const PropertyDetailSlideOver = ({
  appraisalId,
  propertyId,
  propertyType,
}: PropertyDetailSlideOverProps) => {
  const config = getConfig(propertyType);

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

  const sections = getSectionsForType(propertyType);

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

      {/* Section-based detail fields */}
      {sections.map(section => {
        const hasData = section.fields.some(f => {
          const v = data[f.key];
          return v != null && v !== '';
        });
        if (!hasData) return null;

        return (
          <div key={section.title}>
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">{section.title}</h4>
            <div className="space-y-0">
              {section.fields.map(field => {
                const value = data[field.key];
                if (value == null && !field.isBoolean) return null;
                if (value === '' && !field.isBoolean) return null;

                // Parameter group → use ParameterDisplay
                if (field.parameterGroup) {
                  const code = Array.isArray(value) ? value : value != null ? String(value) : null;
                  if (!code || (typeof code === 'string' && code === '')) return null;
                  return (
                    <div key={field.key} className="flex justify-between py-1.5 border-b border-gray-50">
                      <span className="text-xs text-gray-500 shrink-0">{field.label}</span>
                      <ParameterDisplay
                        group={field.parameterGroup}
                        code={code}
                        className="text-sm text-gray-900 text-right max-w-[60%] truncate ml-4"
                        fallback={typeof code === 'string' ? code : '-'}
                      />
                    </div>
                  );
                }

                // Boolean
                if (field.isBoolean) {
                  if (value == null) return null;
                  return <DetailRow key={field.key} label={field.label} value={value ? 'Yes' : 'No'} />;
                }

                // Date
                if (field.isDate) {
                  return <DetailRow key={field.key} label={field.label} value={formatDate(value)} />;
                }

                // Number
                if (field.isNumber && value != null) {
                  return <DetailRow key={field.key} label={field.label} value={formatNumber(value, field.decimalPlaces)} />;
                }

                // Array
                if (Array.isArray(value)) {
                  return <DetailRow key={field.key} label={field.label} value={value.join(', ')} />;
                }

                // Default string
                return <DetailRow key={field.key} label={field.label} value={String(value)} />;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const TitleDeedCard = ({ title, idx }: { title: any; idx: number }) => {
  const [isOpen, setIsOpen] = useState(false);
  const titleName = title.titleNumber || `Title ${idx + 1}`;

  // Build area string: e.g. "1-2-50.00" (Rai-Ngan-Sq.Wa)
  const areaParts: string[] = [];
  if (title.rai != null) areaParts.push(String(title.rai));
  if (title.ngan != null) areaParts.push(String(title.ngan));
  if (title.squareWa != null) areaParts.push(String(title.squareWa));
  const areaStr = areaParts.length > 0 ? areaParts.join('-') : null;

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {/* Header — clickable to toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon name="file-contract" style="solid" className="w-3.5 h-3.5 text-teal-500" />
          <span className="text-sm font-semibold text-gray-900">{titleName}</span>
        </div>
        <div className="flex items-center gap-2">
          {title.titleType && (
            <span className="text-[10px] font-medium text-gray-500 px-1.5 py-0.5 rounded bg-gray-200 uppercase">
              {title.titleType}
            </span>
          )}
          <Icon
            name="chevron-down"
            style="solid"
            className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>
      {/* Body — collapsible */}
      {isOpen && (
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
      )}
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
