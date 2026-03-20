import { useState } from 'react';
import Icon from '@/shared/components/Icon';
import ParameterDisplay from '@/shared/components/ParameterDisplay';
import type { PropertyGroup, PropertyType } from '../../types';
import PhotoPreviewModal, { type PreviewablePhoto } from '../PhotoPreviewModal';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface PropertyGroupCardProps {
  group: PropertyGroup;
  onPropertyClick: (propertyId: string, propertyType: PropertyType, groupName: string) => void;
}

const PropertyGroupCard = ({ group, onPropertyClick }: PropertyGroupCardProps) => {
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      {/* Group header */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
          <Icon name="layer-group" style="solid" className="w-3.5 h-3.5 text-purple-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {group.name || `Group ${group.groupNumber ?? ''}`}
          </h3>
          {group.description && (
            <p className="text-xs text-gray-500">{group.description}</p>
          )}
        </div>
        <span className="ml-auto text-xs font-medium text-gray-400">
          {group.items.length} {group.items.length === 1 ? 'property' : 'properties'}
        </span>
      </div>

      {/* Body: Photos left + Table right */}
      <div className="flex">
        {/* Left: Photo gallery */}
        {heroPhoto && (
          <div className="w-64 shrink-0 border-r border-gray-100 p-3 flex flex-col gap-2">
            {/* Hero image */}
            <button
              type="button"
              onClick={() => setPreviewPhoto(heroPhoto)}
              className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 border border-gray-200 hover:border-teal-300 hover:shadow-md transition-all"
            >
              <img
                src={`${API_BASE_URL}/documents/${heroPhoto.id}/download?download=false&size=large`}
                alt={heroPhoto.caption || 'Property photo'}
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
                      className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200 hover:border-teal-300 hover:shadow-md transition-all"
                    >
                      <img
                        src={`${API_BASE_URL}/documents/${photo.id}/download?download=false&size=large`}
                        alt={photo.caption || 'Property photo'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {isLast && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-sm font-semibold text-white">+{remainingCount}</span>
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
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase w-10">#</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase w-[22%]">Type</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase w-[25%]">Property Name</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase w-[18%]">Area</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-6 py-2.5 w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {group.items.map((item, idx) => (
                    <tr
                      key={item.id}
                      className="hover:bg-teal-50/50 cursor-pointer transition-colors"
                      onClick={() => onPropertyClick(item.id, item.type, group.name)}
                    >
                      <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-gray-700">
                          <PropertyTypeIcon type={item.type} />
                          <ParameterDisplay group="PropertyType" code={item.type} fallback={item.type} />
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 truncate">
                        {item.address}
                      </td>
                      <td className="px-4 py-3 text-gray-700 truncate">{item.area}</td>
                      <td className="px-4 py-3 text-gray-500 truncate">
                        {item.location}
                      </td>
                      <td className="px-6 py-3 text-gray-400">
                        <Icon name="chevron-right" style="solid" className="w-3 h-3" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-5 text-center text-sm text-gray-400">No properties in this group.</div>
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

const PropertyTypeIcon = ({ type }: { type: string }) => {
  const iconMap: Record<string, string> = {
    Lands: 'earth-asia',
    L: 'earth-asia',
    Building: 'house',
    B: 'house',
    Condominium: 'building',
    U: 'building',
    'Land and building': 'house-chimney',
    LB: 'house-chimney',
    Machine: 'gear',
    M: 'gear',
    Vehicle: 'car',
    Vessel: 'ship',
  };
  const icon = iconMap[type] || 'building';
  return <Icon name={icon} style="solid" className="w-3 h-3 text-gray-400" />;
};

export default PropertyGroupCard;
