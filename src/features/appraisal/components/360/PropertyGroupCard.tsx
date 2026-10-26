import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import ParameterDisplay from '@/shared/components/ParameterDisplay';
import { getPropertyIcon } from '../../utils/propertyTypeConfig';
import type { PropertyGroup, PropertyType } from '../../types';
import PhotoPreviewModal, { type PreviewablePhoto } from '../PhotoPreviewModal';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface PropertyGroupCardProps {
  group: PropertyGroup;
  onPropertyClick: (propertyId: string, propertyType: PropertyType, groupName: string) => void;
}

const PropertyGroupCard = ({ group, onPropertyClick }: PropertyGroupCardProps) => {
  const { t } = useTranslation('appraisal');
  const [previewPhoto, setPreviewPhoto] = useState<PreviewablePhoto | null>(null);

  // Collect all photos from all properties in the group
  const allPhotos: PreviewablePhoto[] = group.items.flatMap(item =>
    (item.photos ?? []).map(p => ({
      id: p.documentId,
      src: `${API_BASE_URL}/documents/${p.documentId}/download?download=false`,
      caption: item.address || undefined,
    })),
  );

  const heroPhoto = allPhotos[0] ?? null;
  const thumbPhotos = allPhotos.slice(1, 4); // show up to 3 small thumbnails
  const remainingCount = allPhotos.length - 4; // remaining after hero + 3

  return (
    <div className="bg-(--palette-surface) rounded-2xl shadow-sm border border-(--palette-line-soft)">
      {/* Group header */}
      <div className="px-5 py-3 border-b border-(--palette-line-soft) flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
          <Icon name="layer-group" style="solid" className="w-3.5 h-3.5 text-purple-500" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-(--palette-ink)">
            {group.name || t('view360.groupCard.groupFallback', { n: group.groupNumber ?? '' })}
          </h3>
          {group.description && (
            <p className="text-xs text-(--palette-gray-500)">{group.description}</p>
          )}
        </div>
        <span className="ml-auto text-xs font-medium text-(--palette-gray-400)">
          {t('view360.groupCard.propertyCount', { count: group.items.length })}
        </span>
      </div>

      {/* Body: Photos left + Table right */}
      <div className="flex">
        {/* Left: Photo gallery */}
        {heroPhoto && (
          <div className="w-64 shrink-0 border-r border-(--palette-line-soft) p-3 flex flex-col gap-2">
            {/* Hero image */}
            <button
              type="button"
              onClick={() => setPreviewPhoto(heroPhoto)}
              className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-(--palette-surface-3) border border-(--palette-line) hover:border-teal-300 dark:hover:border-teal-500/40 hover:shadow-md transition-all"
            >
              <img
                src={`${API_BASE_URL}/documents/${heroPhoto.id}/download?download=false&size=large`}
                alt={heroPhoto.caption || t('view360.groupCard.photoAlt')}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>

            {/* Thumbnail row */}
            {thumbPhotos.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5">
                {thumbPhotos.map((photo, idx) => {
                  const isLast = idx === thumbPhotos.length - 1 && remainingCount > 0;
                  return (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => setPreviewPhoto(photo)}
                      className="relative aspect-square rounded-lg overflow-hidden bg-(--palette-surface-3) border border-(--palette-line) hover:border-teal-300 dark:hover:border-teal-500/40 hover:shadow-md transition-all"
                    >
                      <img
                        src={`${API_BASE_URL}/documents/${photo.id}/download?download=false&size=large`}
                        alt={photo.caption || t('view360.groupCard.photoAlt')}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {isLast && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-sm font-semibold text-white">
                            +{remainingCount}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Right: Property table */}
        <div className="flex-1 min-w-0">
          {group.items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-fixed">
                <thead>
                  <tr className="bg-(--palette-surface-2) text-left">
                    <th className="px-4 py-2.5 text-xs font-medium text-(--palette-gray-500) uppercase w-10">
                      #
                    </th>
                    <th className="px-4 py-2.5 text-xs font-medium text-(--palette-gray-500) uppercase w-[22%]">
                      {t('view360.groupCard.columns.type')}
                    </th>
                    <th className="px-4 py-2.5 text-xs font-medium text-(--palette-gray-500) uppercase w-[25%]">
                      {t('view360.groupCard.columns.propertyName')}
                    </th>
                    <th className="px-4 py-2.5 text-xs font-medium text-(--palette-gray-500) uppercase w-[18%]">
                      {t('view360.groupCard.columns.area')}
                    </th>
                    <th className="px-4 py-2.5 text-xs font-medium text-(--palette-gray-500) uppercase">
                      {t('view360.groupCard.columns.location')}
                    </th>
                    <th className="text-xs px-6 py-2.5 w-12 font-semibold" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--palette-line-soft)">
                  {group.items.map((item, idx) => (
                    <tr
                      key={item.id}
                      className="hover:bg-(--palette-accent-wash)/50 cursor-pointer transition-colors"
                      onClick={() => onPropertyClick(item.id, item.type, group.name)}
                    >
                      <td className="px-4 py-3 text-(--palette-gray-500)">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-(--palette-ink)">
                          <PropertyTypeIcon type={item.type} />
                          <ParameterDisplay
                            group="PropertyType"
                            code={item.type}
                            fallback={item.type}
                          />
                        </span>
                      </td>
                      <td className="px-4 py-3 text-(--palette-ink) truncate">{item.address}</td>
                      <td className="px-4 py-3 text-(--palette-ink) truncate">{item.area}</td>
                      <td className="px-4 py-3 text-(--palette-gray-500) truncate">
                        {item.location}
                      </td>
                      {/* The real control: a <tr onClick> alone is unreachable by keyboard,
                          and role="button" on a <tr> would break row/column semantics. */}
                      <td className="px-6 py-3">
                        <button
                          type="button"
                          onClick={e => {
                            // Without this the click also bubbles to the row handler and
                            // the slide-over opens twice.
                            e.stopPropagation();
                            onPropertyClick(item.id, item.type, group.name);
                          }}
                          aria-label={t('view360.groupCard.viewPropertyDetail', {
                            name: item.address,
                          })}
                          className="flex items-center justify-center rounded text-(--palette-gray-400) transition-colors hover:text-(--palette-gray-600) focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                          <Icon
                            name="chevron-right"
                            style="solid"
                            className="w-3 h-3"
                            aria-hidden="true"
                          />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-5 text-center text-sm text-(--palette-gray-400)">
              {t('view360.groupCard.empty')}
            </div>
          )}
        </div>
      </div>

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <PhotoPreviewModal
          photo={previewPhoto}
          photos={allPhotos}
          onClose={() => setPreviewPhoto(null)}
          onNavigate={setPreviewPhoto}
          showInUseStatus={false}
        />
      )}
    </div>
  );
};

/** The same drawing the Property Information tab uses for this type. */
const PropertyTypeIcon = ({ type }: { type: string }) => {
  const icon = getPropertyIcon(type);
  return <Icon name={icon.name} style={icon.style} className="w-3 h-3 text-(--palette-gray-400)" />;
};

export default PropertyGroupCard;
