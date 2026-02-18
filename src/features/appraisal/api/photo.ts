import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  GetPhotoTopicsResultType,
  CreatePhotoTopicRequestType,
  CreatePhotoTopicResultType,
  UpdatePhotoTopicRequestType,
  UpdatePhotoTopicResultType,
  AssignPhotoToTopicRequestType,
  AssignPhotoToTopicResultType,
} from '@shared/schemas/v1';
import type {
  // Collateral Photo Types
  CollateralType,
  CollateralPhotoTopic,
  CollateralPhoto,
  GetCollateralPhotoTopicsResponse,
  CreateCollateralPhotoTopicRequest,
  CreateCollateralPhotoTopicResponse,
  UpdateCollateralPhotoTopicRequest,
  UpdateCollateralPhotoTopicResponse,
  DeleteCollateralPhotoTopicResponse,
  GetCollateralPhotosResponse,
  AddPhotoToCollateralRequest,
  AddPhotoToCollateralResponse,
  RemovePhotoFromCollateralResponse,
  ReorderCollateralPhotosRequest,
  ReorderCollateralPhotosResponse,
} from '../types/photo';
import { DEFAULT_TOPICS_BY_TYPE } from '../types/photo';

// ==================== Photo Topic APIs ====================

export const photoTopicKeys = {
  all: (appraisalId: string) => ['appraisal', appraisalId, 'photo-topics'] as const,
};

/**
 * Hook for fetching photo topics for an appraisal
 * GET /appraisals/{appraisalId}/photo-topics
 */
export const useGetPhotoTopics = (appraisalId: string | undefined) => {
  return useQuery({
    queryKey: ['appraisal', appraisalId, 'photo-topics'],
    queryFn: async (): Promise<GetPhotoTopicsResultType> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/photo-topics`);
      return data;
    },
    enabled: !!appraisalId,
  });
};

/**
 * Hook for creating a new photo topic
 * POST /appraisals/{appraisalId}/photo-topics
 */
export const useCreatePhotoTopic = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appraisalId,
      ...body
    }: CreatePhotoTopicRequestType & { appraisalId: string }): Promise<CreatePhotoTopicResultType> => {
      const { data } = await axios.post(`/appraisals/${appraisalId}/photo-topics`, body);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: photoTopicKeys.all(variables.appraisalId),
      });
    },
  });
};

/**
 * Hook for updating a photo topic
 * PUT /appraisals/{appraisalId}/photo-topics/{topicId}
 */
export const useUpdatePhotoTopic = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appraisalId,
      topicId,
      ...body
    }: UpdatePhotoTopicRequestType & {
      appraisalId: string;
      topicId: string;
    }): Promise<UpdatePhotoTopicResultType> => {
      const { data } = await axios.put(
        `/appraisals/${appraisalId}/photo-topics/${topicId}`,
        body
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: photoTopicKeys.all(variables.appraisalId),
      });
    },
  });
};

/**
 * Hook for deleting a photo topic
 * DELETE /appraisals/{appraisalId}/photo-topics/{topicId}
 */
export const useDeletePhotoTopic = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appraisalId,
      topicId,
    }: {
      appraisalId: string;
      topicId: string;
    }): Promise<void> => {
      await axios.delete(`/appraisals/${appraisalId}/photo-topics/${topicId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: photoTopicKeys.all(variables.appraisalId),
      });
    },
  });
};

/**
 * Hook for assigning/unassigning a gallery photo to a topic
 * PUT /appraisals/{appraisalId}/gallery/{photoId}/assign-topic
 */
export const useAssignPhotoToTopic = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appraisalId,
      photoId,
      ...body
    }: AssignPhotoToTopicRequestType & {
      appraisalId: string;
      photoId: string;
    }): Promise<AssignPhotoToTopicResultType> => {
      const { data } = await axios.put(
        `/appraisals/${appraisalId}/gallery/${photoId}/assign-topic`,
        body
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: photoTopicKeys.all(variables.appraisalId),
      });
      queryClient.invalidateQueries({
        queryKey: ['appraisal', variables.appraisalId, 'gallery'],
      });
    },
  });
};

// ==================== Collateral-Level Photo APIs ====================

/**
 * Hook for fetching collateral photo topics
 * GET /collaterals/{collateralId}/photo-topics
 */
export const useGetCollateralPhotoTopics = (
  collateralId: string | undefined,
  collateralType: CollateralType | undefined
) => {
  return useQuery({
    queryKey: ['collateral-photo-topics', collateralId],
    queryFn: async (): Promise<GetCollateralPhotoTopicsResponse> => {
      // TODO: Replace with actual API call
      // const { data } = await axios.get(`/collaterals/${collateralId}/photo-topics`);
      // return data;

      // Mock: Generate default topics based on collateral type
      await new Promise(resolve => setTimeout(resolve, 300));
      const defaultTopics = collateralType ? DEFAULT_TOPICS_BY_TYPE[collateralType] : [];

      return {
        topics: defaultTopics.map((name, index) => ({
          id: `topic-${collateralId}-${index + 1}`,
          collateralId: collateralId!,
          collateralType: collateralType!,
          name,
          layout: 2 as const,
          order: index + 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
      };
    },
    enabled: !!collateralId && !!collateralType,
  });
};

/**
 * Hook for creating a collateral photo topic
 * POST /collaterals/{collateralId}/photo-topics
 */
export const useCreateCollateralPhotoTopic = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: CreateCollateralPhotoTopicRequest
    ): Promise<CreateCollateralPhotoTopicResponse> => {
      // TODO: Replace with actual API call
      // const { data } = await axios.post(`/collaterals/${request.collateralId}/photo-topics`, request);
      // return data;

      await new Promise(resolve => setTimeout(resolve, 200));
      return {
        isSuccess: true,
        topic: {
          id: `topic-${Date.now()}`,
          collateralId: request.collateralId,
          collateralType: request.collateralType,
          name: request.name,
          layout: request.layout || 2,
          order: 999,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
    },
    onSuccess: (data, variables) => {
      // Update query cache directly instead of invalidating (mock mode)
      // This ensures newly created topics persist in the UI
      queryClient.setQueryData<GetCollateralPhotoTopicsResponse>(
        ['collateral-photo-topics', variables.collateralId],
        oldData => {
          if (!oldData) return { topics: [data.topic] };
          return {
            topics: [...oldData.topics, data.topic],
          };
        }
      );
    },
  });
};

/**
 * Hook for updating a collateral photo topic
 * PUT /collateral-photo-topics/{topicId}
 */
export const useUpdateCollateralPhotoTopic = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: UpdateCollateralPhotoTopicRequest & { collateralId: string }
    ): Promise<UpdateCollateralPhotoTopicResponse> => {
      // TODO: Replace with actual API call
      // const { data } = await axios.put(`/collateral-photo-topics/${request.topicId}`, request);
      // return data;

      await new Promise(resolve => setTimeout(resolve, 200));
      return {
        isSuccess: true,
        topic: {
          id: request.topicId,
          collateralId: request.collateralId,
          collateralType: 'land',
          name: request.name || '',
          layout: request.layout || 2,
          order: request.order || 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
    },
    onSuccess: (data, variables) => {
      // Update query cache directly (mock mode)
      queryClient.setQueryData<GetCollateralPhotoTopicsResponse>(
        ['collateral-photo-topics', variables.collateralId],
        oldData => {
          if (!oldData) return { topics: [data.topic] };
          return {
            topics: oldData.topics.map(topic =>
              topic.id === variables.topicId
                ? { ...topic, ...data.topic }
                : topic
            ),
          };
        }
      );
    },
  });
};

/**
 * Hook for deleting a collateral photo topic
 * DELETE /collateral-photo-topics/{topicId}
 */
export const useDeleteCollateralPhotoTopic = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_params: {
      topicId: string;
      collateralId: string;
    }): Promise<DeleteCollateralPhotoTopicResponse> => {
      // TODO: Replace with actual API call
      // const { data } = await axios.delete(`/collateral-photo-topics/${_params.topicId}`);
      // return data;

      await new Promise(resolve => setTimeout(resolve, 200));
      return { isSuccess: true };
    },
    onSuccess: (_, variables) => {
      // Update query cache directly (mock mode)
      queryClient.setQueryData<GetCollateralPhotoTopicsResponse>(
        ['collateral-photo-topics', variables.collateralId],
        oldData => {
          if (!oldData) return { topics: [] };
          return {
            topics: oldData.topics.filter(topic => topic.id !== variables.topicId),
          };
        }
      );
      // Also clear any photos that were in this topic
      queryClient.setQueryData<GetCollateralPhotosResponse>(
        ['collateral-photos', variables.collateralId],
        oldData => {
          if (!oldData) return { photos: [] };
          return {
            photos: oldData.photos.filter(photo => photo.topicId !== variables.topicId),
          };
        }
      );
    },
  });
};

/**
 * Hook for fetching collateral photos
 * GET /collaterals/{collateralId}/photos
 */
export const useGetCollateralPhotos = (
  collateralId: string | undefined,
  topicId?: string
) => {
  return useQuery({
    queryKey: ['collateral-photos', collateralId, topicId],
    queryFn: async (): Promise<GetCollateralPhotosResponse> => {
      // TODO: Replace with actual API call
      // const { data } = await axios.get(`/collaterals/${collateralId}/photos`, {
      //   params: { topicId },
      // });
      // return data;

      // Mock empty response
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        photos: [],
      };
    },
    enabled: !!collateralId,
  });
};

/**
 * Hook for adding a photo to a collateral (from gallery)
 * POST /collaterals/{collateralId}/photos
 */
export const useAddPhotoToCollateral = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: AddPhotoToCollateralRequest
    ): Promise<AddPhotoToCollateralResponse> => {
      // TODO: Replace with actual API call
      // const { data } = await axios.post(`/collaterals/${request.collateralId}/photos`, request);
      // return data;

      await new Promise(resolve => setTimeout(resolve, 200));
      return {
        isSuccess: true,
        photo: {
          id: `collateral-photo-${Date.now()}`,
          galleryPhotoId: request.galleryPhotoId,
          collateralId: request.collateralId,
          topicId: request.topicId,
          order: 999,
          src: '', // Would be populated from gallery photo
          fileName: '',
        },
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['collateral-photos', variables.collateralId],
      });
      queryClient.invalidateQueries({ queryKey: ['gallery-photos'] });
    },
  });
};

/**
 * Hook for removing a photo from a collateral
 * DELETE /collateral-photos/{photoId}
 */
export const useRemovePhotoFromCollateral = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_params: {
      photoId: string;
      collateralId: string;
    }): Promise<RemovePhotoFromCollateralResponse> => {
      // TODO: Replace with actual API call
      // const { data } = await axios.delete(`/collateral-photos/${_params.photoId}`);
      // return data;

      await new Promise(resolve => setTimeout(resolve, 200));
      return { isSuccess: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['collateral-photos', variables.collateralId],
      });
      queryClient.invalidateQueries({ queryKey: ['gallery-photos'] });
    },
  });
};

/**
 * Hook for reordering photos within a topic
 * PUT /collaterals/{collateralId}/photos/reorder
 */
export const useReorderCollateralPhotos = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      _request: ReorderCollateralPhotosRequest
    ): Promise<ReorderCollateralPhotosResponse> => {
      // TODO: Replace with actual API call
      // const { data } = await axios.put(
      //   `/collaterals/${_request.collateralId}/photos/reorder`,
      //   _request
      // );
      // return data;

      await new Promise(resolve => setTimeout(resolve, 200));
      return { isSuccess: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['collateral-photos', variables.collateralId],
      });
    },
  });
};

// Re-export types for convenience
export type { CollateralType, CollateralPhotoTopic, CollateralPhoto };
