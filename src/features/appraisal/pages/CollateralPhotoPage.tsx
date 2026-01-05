import { useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

import NavAnchors from '@/shared/components/sections/NavAnchors';
import Icon from '@/shared/components/Icon';
import CollateralPhotoTab from '../components/CollateralPhotoTab';
import type { CollateralType } from '../types/photo';

/**
 * Standalone page for managing collateral photos.
 * This page is accessed as the last tab when editing a collateral.
 * Route: /appraisal/:appraisalId/property/:collateralType/:propertyId/photos
 */
const CollateralPhotoPage = () => {
  const { propertyId } = useParams<{
    propertyId?: string;
  }>();
  const location = useLocation();

  // Determine collateral type from URL path
  const collateralType = useMemo((): CollateralType => {
    const path = location.pathname;
    if (path.includes('/land-building/')) return 'land-building';
    if (path.includes('/building/')) return 'building';
    if (path.includes('/condo/')) return 'condo';
    if (path.includes('/land/')) return 'land';
    return 'land'; // default
  }, [location.pathname]);

  // Generate a stable collateralId for new properties
  const collateralId = useMemo(() => {
    return propertyId || uuidv4();
  }, [propertyId]);

  // Get the detail page path (without /photos)
  const detailHref = useMemo(() => {
    return location.pathname.replace('/photos', '');
  }, [location.pathname]);

  // Build anchors based on collateral type - same as detail pages
  const anchors = useMemo(() => {
    const baseAnchors = {
      land: [
        { label: 'Land', id: 'properties-section', icon: 'mountain-sun', href: detailHref },
      ],
      building: [
        { label: 'Building', id: 'properties-section', icon: 'building', href: detailHref },
      ],
      condo: [
        { label: 'Condo', id: 'properties-section', icon: 'building', href: detailHref },
      ],
      'land-building': [
        { label: 'Land', id: 'land-section', icon: 'mountain-sun', href: detailHref },
        { label: 'Building', id: 'building-section', icon: 'building', href: detailHref },
      ],
    };

    return [
      ...baseAnchors[collateralType],
      { label: 'Photos', id: 'photos', icon: 'images' },
    ];
  }, [collateralType, detailHref]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* NavAnchors - same as other collateral pages */}
      <div className="shrink-0 pb-4">
        <NavAnchors
          containerId="photo-scroll-container"
          anchors={anchors}
        />
      </div>

      {/* Photo Content */}
      <div id="photo-scroll-container" className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-smooth p-6">
        <div id="photos" className="flex-auto flex flex-col gap-6 min-w-0">
          {/* Photos Section Header */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Icon name="images" style="solid" className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Photos</h2>
            </div>
            <div className="h-px bg-gray-200" />
          </div>

          <CollateralPhotoTab
            collateralId={collateralId}
            collateralType={collateralType}
          />
        </div>
      </div>
    </div>
  );
};

export default CollateralPhotoPage;
