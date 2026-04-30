import { forwardRef, useImperativeHandle, useRef } from 'react';
import EntityPhotoSection, {
  type EntityPhotoSectionRef,
} from '@features/appraisal/components/EntityPhotoSection';
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
}

const ProjectModelPhotoSection = forwardRef<
  ProjectModelPhotoSectionRef,
  ProjectModelPhotoSectionProps
>(({ appraisalId, entityId, images }, ref) => {
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
    />
  );
});

ProjectModelPhotoSection.displayName = 'ProjectModelPhotoSection';

export default ProjectModelPhotoSection;
