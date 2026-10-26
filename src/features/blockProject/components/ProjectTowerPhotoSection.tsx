import { type ReactNode, forwardRef, useImperativeHandle, useRef } from 'react';
import EntityPhotoSection, {
  type EntityPhotoSectionRef,
} from '@features/appraisal/components/EntityPhotoSection';
import type { PhotoSectionView } from '@features/appraisal/components/PropertyPhotoSection';
import {
  useAddProjectTowerImage,
  useRemoveProjectTowerImage,
  useSetProjectTowerImageThumbnail,
  useUnsetProjectTowerImageThumbnail,
} from '../api/projectTower';

export interface ProjectTowerPhotoSectionRef {
  linkImagesToTower: (towerId: string) => Promise<void>;
}

interface ProjectTowerPhotoSectionProps {
  appraisalId: string;
  entityId?: string;
  images?: Array<{
    id: string;
    galleryPhotoId: string;
    displaySequence: number;
    title?: string | null;
    description?: string | null;
    isThumbnail: boolean;
  }>;
  /** Draws the photos instead of the default strip, e.g. as the cover tile of the Condo identity band. */
  renderGallery?: (view: PhotoSectionView) => ReactNode;
}

const ProjectTowerPhotoSection = forwardRef<
  ProjectTowerPhotoSectionRef,
  ProjectTowerPhotoSectionProps
>(({ appraisalId, entityId, images, renderGallery }, ref) => {
  const innerRef = useRef<EntityPhotoSectionRef>(null);

  useImperativeHandle(ref, () => ({
    linkImagesToTower: async (towerId: string) => {
      await innerRef.current?.linkImagesToEntity(towerId);
    },
  }));

  return (
    <EntityPhotoSection
      ref={innerRef}
      appraisalId={appraisalId}
      entityId={entityId}
      images={images}
      useAddImage={useAddProjectTowerImage}
      useRemoveImage={useRemoveProjectTowerImage}
      useSetThumbnail={useSetProjectTowerImageThumbnail}
      useUnsetThumbnail={useUnsetProjectTowerImageThumbnail}
      renderGallery={renderGallery}
    />
  );
});

ProjectTowerPhotoSection.displayName = 'ProjectTowerPhotoSection';

export default ProjectTowerPhotoSection;
