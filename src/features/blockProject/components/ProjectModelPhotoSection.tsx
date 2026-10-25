import { type ReactNode, forwardRef, useImperativeHandle, useRef } from 'react';
import EntityPhotoSection, {
  type EntityPhotoSectionRef,
} from '@features/appraisal/components/EntityPhotoSection';
import type { PhotoSectionView } from '@features/appraisal/components/PropertyPhotoSection';
import {
  useAddProjectModelImage,
  useRemoveProjectModelImage,
  useSetProjectModelImageThumbnail,
  useUnsetProjectModelImageThumbnail,
} from '../api/projectModel';

export interface ProjectModelPhotoSectionRef {
  linkImagesToModel: (modelId: string) => Promise<void>;
}

interface ProjectModelPhotoSectionProps {
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

const ProjectModelPhotoSection = forwardRef<
  ProjectModelPhotoSectionRef,
  ProjectModelPhotoSectionProps
>(({ appraisalId, entityId, images, renderGallery }, ref) => {
  const innerRef = useRef<EntityPhotoSectionRef>(null);

  useImperativeHandle(ref, () => ({
    linkImagesToModel: async (modelId: string) => {
      await innerRef.current?.linkImagesToEntity(modelId);
    },
  }));

  return (
    <EntityPhotoSection
      ref={innerRef}
      appraisalId={appraisalId}
      entityId={entityId}
      images={images}
      useAddImage={useAddProjectModelImage}
      useRemoveImage={useRemoveProjectModelImage}
      useSetThumbnail={useSetProjectModelImageThumbnail}
      useUnsetThumbnail={useUnsetProjectModelImageThumbnail}
      renderGallery={renderGallery}
    />
  );
});

ProjectModelPhotoSection.displayName = 'ProjectModelPhotoSection';

export default ProjectModelPhotoSection;
