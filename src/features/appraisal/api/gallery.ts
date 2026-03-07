import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  AddGalleryPhotoRequestType,
  AddGalleryPhotoResponseType,
  GetGalleryPhotosResultType,
  LinkPhotoToPropertyRequestType,
  LinkPhotoToPropertyResponseType,
  SetPropertyThumbnailResultType,
  UnsetPropertyThumbnailResultType,
  UpdateGalleryPhotoRequestType,
  UpdateGalleryPhotoResponseType,
} from '@shared/schemas/v1';
import { propertyGroupKeys } from './propertyGroup';
import { photoTopicKeys } from './photo';

/**
 * Get all gallery photos for an appraisal
 * GET /appraisals/{appraisalId}/gallery
 */
export const useGetGalleryPhotos = (appraisalId: string | undefined) => {
  return useQuery({
    queryKey: ['appraisal', appraisalId, 'gallery'],
    queryFn: async (): Promise<GetGalleryPhotosResultType> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/gallery`);
      return data;
    },
    enabled: !!appraisalId,
  });
};

/**
 * Add a gallery photo (after document upload)
 * POST /appraisals/{appraisalId}/gallery
 */
export const useAddGalleryPhoto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appraisalId,
      ...body
    }: AddGalleryPhotoRequestType & {
      appraisalId: string;
    }): Promise<AddGalleryPhotoResponseType> => {
      const { data } = await axios.post(`/appraisals/${appraisalId}/gallery`, body);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['appraisal', variables.appraisalId, 'gallery'],
      });
    },
  });
};

/**
 * Update a gallery photo's metadata
 * PUT /appraisals/{appraisalId}/gallery/{photoId}
 */
export const useUpdateGalleryPhoto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appraisalId,
      photoId,
      ...body
    }: UpdateGalleryPhotoRequestType & {
      appraisalId: string;
      photoId: string;
    }): Promise<UpdateGalleryPhotoResponseType> => {
      const { data } = await axios.put(`/appraisals/${appraisalId}/gallery/${photoId}`, body);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['appraisal', variables.appraisalId, 'gallery'],
      });
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.all(variables.appraisalId),
      });
      queryClient.invalidateQueries({
        queryKey: photoTopicKeys.all(variables.appraisalId),
      });
    },
  });
};

/**
 * Remove a gallery photo
 * DELETE /appraisals/{appraisalId}/gallery/{photoId}
 */
export const useRemoveGalleryPhoto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appraisalId,
      photoId,
    }: {
      appraisalId: string;
      photoId: string;
    }): Promise<void> => {
      await axios.delete(`/appraisals/${appraisalId}/gallery/${photoId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['appraisal', variables.appraisalId, 'gallery'],
      });
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.all(variables.appraisalId),
      });
    },
  });
};

/**
 * Link a photo to a property (by appraisalPropertyId)
 * POST /appraisals/{appraisalId}/gallery/{photoId}/property-links
 */
export const useLinkPhotoToProperty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appraisalId,
      photoId,
      ...body
    }: LinkPhotoToPropertyRequestType & {
      appraisalId: string;
      photoId: string;
    }): Promise<LinkPhotoToPropertyResponseType> => {
      const { data } = await axios.post(
        `/appraisals/${appraisalId}/gallery/${photoId}/property-links`,
        body,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['appraisal', variables.appraisalId, 'gallery'],
      });
      // Refresh property groups so the linked image shows on property cards
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.all(variables.appraisalId),
      });
    },
  });
};

/**
 * Unlink a photo from a property
 * DELETE /appraisals/{appraisalId}/gallery/property-links/{mappingId}
 */
export const useUnlinkPhotoFromProperty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appraisalId,
      mappingId,
    }: {
      appraisalId: string;
      mappingId: string;
    }): Promise<void> => {
      await axios.delete(`/appraisals/${appraisalId}/gallery/property-links/${mappingId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['appraisal', variables.appraisalId, 'gallery'],
      });
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.all(variables.appraisalId),
      });
    },
  });
};

/**
 * Set a photo as the thumbnail for its linked property
 * PUT /appraisals/{appraisalId}/properties/{propertyId}/photos/{photoId}/set-thumbnail
 */
export const useSetPropertyThumbnail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appraisalId,
      propertyId,
      photoId,
    }: {
      appraisalId: string;
      propertyId: string;
      photoId: string;
    }): Promise<SetPropertyThumbnailResultType> => {
      const { data } = await axios.put(
        `/appraisals/${appraisalId}/properties/${propertyId}/photos/${photoId}/set-thumbnail`,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['appraisal', variables.appraisalId, 'gallery'],
      });
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.all(variables.appraisalId),
      });
    },
  });
};

/**
 * Unset a photo as the thumbnail for its linked property
 * PUT /appraisals/{appraisalId}/properties/{propertyId}/photos/{photoId}/unset-thumbnail
 */
export const useUnsetPropertyThumbnail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appraisalId,
      propertyId,
      photoId,
    }: {
      appraisalId: string;
      propertyId: string;
      photoId: string;
    }): Promise<UnsetPropertyThumbnailResultType> => {
      const { data } = await axios.put(
        `/appraisals/${appraisalId}/properties/${propertyId}/photos/${photoId}/unset-thumbnail`,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['appraisal', variables.appraisalId, 'gallery'],
      });
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.all(variables.appraisalId),
      });
    },
  });
};
