import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import axios from '@shared/api/axiosInstance';
import Icon from '@/shared/components/Icon';
import DataErrorState from '@/shared/components/DataErrorState';
import ParameterDisplay from '@/shared/components/ParameterDisplay';
import type { PropertyType } from '../../types';
import { getSectionsForType } from './propertyDetailFieldConfigs';
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
  const { t } = useTranslation('appraisal');
  const config = getConfig(propertyType);

  // Use the same query key pattern as existing hooks in api/property.ts
  const { data, isLoading, error, refetch } = useQuery({
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

  // Above the early returns so the hook order stays stable. `t` is referentially
  // stable per language, so this only recomputes on a language switch.
  const sections = useMemo(() => getSectionsForType(propertyType, t), [propertyType, t]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icon name="spinner" style="solid" className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <DataErrorState
        variant="inline"
        title={t('view360.errors.propertyDetail')}
        message={(error as Error)?.message}
        onRetry={refetch}
      />
    );
  }

  if (!data) {
    return <p className="text-sm text-gray-500 py-4">{t('view360.propertyDetail.noData')}</p>;
  }

  // Photos from the property detail response
  const photos: any[] = data.photos ?? data.documents ?? [];
  const photoUrls = photos
    .filter((p: any) => p.documentId)
    .map(
      (p: any) => `${API_BASE_URL}/documents/${p.documentId}/download?download=false&size=large`,
    );

  // Title deeds (land types have a `titles` array)
  const titles: any[] = data.titles ?? [];

  return (
    <div className="space-y-6">
      {/* Photos */}
      {photoUrls.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
            {t('view360.propertyDetail.photos')}
          </h4>
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
            <p className="text-xs text-gray-400 mt-1">
              {t('view360.propertyDetail.morePhotos', { n: photoUrls.length - 4 })}
            </p>
          )}
        </div>
      )}

      {/* Title Deeds (for land types) */}
      {titles.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
            {t('view360.propertyDetail.titleDeeds', { n: titles.length })}
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
                    <div
                      key={field.key}
                      className="flex justify-between py-1.5 border-b border-gray-50"
                    >
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
                  return (
                    <DetailRow
                      key={field.key}
                      label={field.label}
                      value={t(value ? 'view360.common.yes' : 'view360.common.no')}
                    />
                  );
                }

                // Date
                if (field.isDate) {
                  return (
                    <DetailRow key={field.key} label={field.label} value={formatDate(value)} />
                  );
                }

                // Number
                if (field.isNumber && value != null) {
                  return (
                    <DetailRow
                      key={field.key}
                      label={field.label}
                      value={formatNumber(value, field.decimalPlaces)}
                    />
                  );
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
  const { t } = useTranslation('appraisal');
  const [isOpen, setIsOpen] = useState(false);
  const titleName = title.titleNumber || t('view360.propertyDetail.titleFallback', { n: idx + 1 });

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
              <span className="text-gray-500">
                {t('view360.propertyDetail.titleDeed.bookNumber')}
              </span>
              <span className="text-gray-900">{title.bookNumber}</span>
            </div>
          )}
          {title.pageNumber && (
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500">
                {t('view360.propertyDetail.titleDeed.pageNumber')}
              </span>
              <span className="text-gray-900">{title.pageNumber}</span>
            </div>
          )}
          {title.rawang && (
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500">{t('view360.propertyDetail.titleDeed.rawang')}</span>
              <span className="text-gray-900">{title.rawang}</span>
            </div>
          )}
          {title.landNumber && (
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500">
                {t('view360.propertyDetail.titleDeed.landNumber')}
              </span>
              <span className="text-gray-900">{title.landNumber}</span>
            </div>
          )}
          {title.surveyNumber && (
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500">
                {t('view360.propertyDetail.titleDeed.surveyNumber')}
              </span>
              <span className="text-gray-900">{title.surveyNumber}</span>
            </div>
          )}
          {title.sheetNumber && (
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500">
                {t('view360.propertyDetail.titleDeed.sheetNumber')}
              </span>
              <span className="text-gray-900">{title.sheetNumber}</span>
            </div>
          )}
          {areaStr && (
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500">{t('view360.propertyDetail.titleDeed.area')}</span>
              <span className="text-gray-900 font-medium">{areaStr}</span>
            </div>
          )}
          {title.governmentPricePerSqWa != null && (
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500">
                {t('view360.propertyDetail.titleDeed.govPricePerSqWa')}
              </span>
              <span className="text-gray-900">
                {Number(title.governmentPricePerSqWa).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          )}
          {title.governmentPrice != null && (
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500">
                {t('view360.propertyDetail.titleDeed.govPrice')}
              </span>
              <span className="text-gray-900 font-medium">
                {Number(title.governmentPrice).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          )}
          {title.isMissingFromSurvey != null && (
            <div className="flex justify-between py-1">
              <span className="text-gray-500">
                {t('view360.propertyDetail.titleDeed.missedOnSurvey')}
              </span>
              <span
                className={
                  title.isMissingFromSurvey ? 'text-amber-600 font-medium' : 'text-gray-900'
                }
              >
                {t(title.isMissingFromSurvey ? 'view360.common.yes' : 'view360.common.no')}
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
