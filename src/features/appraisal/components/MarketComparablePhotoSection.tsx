import { forwardRef, useImperativeHandle, useRef } from 'react';
import type { UseMutationResult } from '@tanstack/react-query';
import {
  useAddMarketComparableImage,
  useRemoveMarketComparableImage,
} from '../api/marketComparable';
import EntityPhotoSection, { type EntityPhotoSectionRef } from './EntityPhotoSection';

export interface MarketComparablePhotoSectionRef {
  linkImagesToComparable: (marketComparableId: string) => Promise<void>;
}

interface MarketComparablePhotoSectionProps {
  appraisalId: string;
  marketComparableId?: string;
  images?: Array<{
    id?: string;
    galleryPhotoId?: string;
    title?: string | null;
    description?: string | null;
  }>;
}

// Thin adapter hooks that bridge { entityId } → { marketComparableId }.
// These delegate entirely to the original hooks so all invalidations
// (including 'photo-topics') are preserved without duplication.

function useAddMarketComparableImageAdapter(): UseMutationResult<
  { id: string },
  unknown,
  { entityId: string; appraisalId: string; galleryPhotoId: string }
> {
  const mutation = useAddMarketComparableImage();
  return {
    ...mutation,
    mutateAsync: async ({ entityId, appraisalId, galleryPhotoId }) => {
      const result = await mutation.mutateAsync({
        marketComparableId: entityId,
        appraisalId,
        galleryPhotoId,
      });
      return { id: result.imageId };
    },
    mutate: (vars, options) => {
      mutation.mutate(
        {
          marketComparableId: vars.entityId,
          appraisalId: vars.appraisalId,
          galleryPhotoId: vars.galleryPhotoId,
        },
        options as Parameters<typeof mutation.mutate>[1],
      );
    },
  } as UseMutationResult<{ id: string }, unknown, { entityId: string; appraisalId: string; galleryPhotoId: string }>;
}

function useRemoveMarketComparableImageAdapter(): UseMutationResult<
  unknown,
  unknown,
  { entityId: string; imageId: string; appraisalId: string }
> {
  const mutation = useRemoveMarketComparableImage();
  return {
    ...mutation,
    mutateAsync: async ({ entityId, imageId, appraisalId }) => {
      return mutation.mutateAsync({ marketComparableId: entityId, imageId, appraisalId });
    },
    mutate: (vars, options) => {
      mutation.mutate(
        { marketComparableId: vars.entityId, imageId: vars.imageId, appraisalId: vars.appraisalId },
        options as Parameters<typeof mutation.mutate>[1],
      );
    },
  } as UseMutationResult<unknown, unknown, { entityId: string; imageId: string; appraisalId: string }>;
}

const MarketComparablePhotoSection = forwardRef<
  MarketComparablePhotoSectionRef,
  MarketComparablePhotoSectionProps
>(({ appraisalId, marketComparableId, images }, ref) => {
  const innerRef = useRef<EntityPhotoSectionRef>(null);

  useImperativeHandle(ref, () => ({
    linkImagesToComparable: async (id: string) => {
      await innerRef.current?.linkImagesToEntity(id);
    },
  }));

  return (
    <EntityPhotoSection
      ref={innerRef}
      appraisalId={appraisalId}
      entityId={marketComparableId}
      images={images}
      useAddImage={useAddMarketComparableImageAdapter}
      useRemoveImage={useRemoveMarketComparableImageAdapter}
      // Thumbnail hooks omitted — cover UI stays hidden for MarketComparable
    />
  );
});

MarketComparablePhotoSection.displayName = 'MarketComparablePhotoSection';

export default MarketComparablePhotoSection;
