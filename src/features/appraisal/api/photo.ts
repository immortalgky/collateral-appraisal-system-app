import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
// import axios from '@shared/api/axiosInstance'; // TODO: Uncomment when API is ready
import type {
  CreatePhotoTopicRequest,
  CreatePhotoTopicResponse,
  UpdatePhotoTopicRequest,
  UpdatePhotoTopicResponse,
  DeletePhotoTopicResponse,
  GetPhotoTopicsResponse,
  CreatePhotoUploadSessionResponse,
  UploadPhotoRequest,
  UploadPhotoResponse,
  GetGalleryPhotosParams,
  GetGalleryPhotosResponse,
  DeletePhotoResponse,
  UpdatePhotoRequest,
  UpdatePhotoResponse,
  AssignPhotosToCollateralRequest,
  AssignPhotosToCollateralResponse,
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

/**
 * Hook for fetching photo topics for an appraisal
 * GET /appraisals/{appraisalId}/photo-topics
 */
export const useGetPhotoTopics = (appraisalId: string | undefined) => {
  return useQuery({
    queryKey: ['photo-topics', appraisalId],
    queryFn: async (): Promise<GetPhotoTopicsResponse> => {
      // TODO: Replace with actual API call
      // const { data } = await axios.get(`/appraisals/${appraisalId}/photo-topics`);
      // return data;

      // Mock data for development
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        topics: [
          {
            id: 'topic-1',
            appraisalId: appraisalId!,
            name: 'Area in front of the project',
            layout: 2,
            order: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'topic-2',
            appraisalId: appraisalId!,
            name: 'Area in front of the collateral',
            layout: 2,
            order: 2,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'topic-3',
            appraisalId: appraisalId!,
            name: 'Collateral',
            layout: 2,
            order: 3,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      };
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
    mutationFn: async (request: CreatePhotoTopicRequest): Promise<CreatePhotoTopicResponse> => {
      // TODO: Replace with actual API call
      // const { data } = await axios.post(`/appraisals/${request.appraisalId}/photo-topics`, request);
      // return data;

      // Mock response
      await new Promise(resolve => setTimeout(resolve, 200));
      return {
        isSuccess: true,
        topic: {
          id: `topic-${Date.now()}`,
          appraisalId: request.appraisalId,
          name: request.name,
          layout: request.layout || 2,
          order: 999,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['photo-topics', variables.appraisalId] });
    },
  });
};

/**
 * Hook for updating a photo topic
 * PUT /photo-topics/{topicId}
 */
export const useUpdatePhotoTopic = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: UpdatePhotoTopicRequest): Promise<UpdatePhotoTopicResponse> => {
      // TODO: Replace with actual API call
      // const { data } = await axios.put(`/photo-topics/${request.topicId}`, request);
      // return data;

      await new Promise(resolve => setTimeout(resolve, 200));
      return {
        isSuccess: true,
        topic: {
          id: request.topicId,
          appraisalId: '',
          name: request.name || '',
          layout: request.layout || 2,
          order: request.order || 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photo-topics'] });
    },
  });
};

/**
 * Hook for deleting a photo topic
 * DELETE /photo-topics/{topicId}
 */
export const useDeletePhotoTopic = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_topicId: string): Promise<DeletePhotoTopicResponse> => {
      // TODO: Replace with actual API call
      // const { data } = await axios.delete(`/photo-topics/${topicId}`);
      // return data;

      await new Promise(resolve => setTimeout(resolve, 200));
      return { isSuccess: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photo-topics'] });
      queryClient.invalidateQueries({ queryKey: ['gallery-photos'] });
    },
  });
};

// ==================== Photo Upload APIs ====================

/**
 * Hook for creating a photo upload session
 * POST /appraisals/{appraisalId}/photo-upload-session
 */
export const useCreatePhotoUploadSession = () => {
  return useMutation({
    mutationFn: async (_appraisalId: string): Promise<CreatePhotoUploadSessionResponse> => {
      // TODO: Replace with actual API call
      // const { data } = await axios.post(`/appraisals/${appraisalId}/photo-upload-session`);
      // return data;

      await new Promise(resolve => setTimeout(resolve, 100));
      return {
        sessionId: `session-${Date.now()}`,
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      };
    },
  });
};

/**
 * Hook for uploading a photo
 * POST /photo-upload
 */
export const useUploadPhoto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: UploadPhotoRequest): Promise<UploadPhotoResponse> => {
      // TODO: Replace with actual API call
      // const formData = new FormData();
      // formData.append('file', request.file);
      // formData.append('sessionId', request.sessionId);
      // formData.append('topicId', request.topicId);
      // formData.append('category', request.category);
      // if (request.description) formData.append('description', request.description);
      // const { data } = await axios.post('/photo-upload', formData, {
      //   headers: { 'Content-Type': 'multipart/form-data' },
      // });
      // return data;

      // Mock response with data URL
      await new Promise(resolve => setTimeout(resolve, 500));
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(request.file);
      });

      return {
        isSuccess: true,
        photo: {
          id: `photo-${Date.now()}`,
          appraisalId: '',
          topicId: request.topicId,
          fileName: `${Date.now()}_${request.file.name}`,
          originalFileName: request.file.name,
          description: request.description,
          category: request.category,
          filePath: dataUrl,
          fileSize: request.file.size,
          mimeType: request.file.type,
          isUsed: false,
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'current-user',
        },
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-photos'] });
    },
  });
};

// ==================== Gallery Photo APIs ====================

/**
 * Hook for fetching gallery photos
 * GET /appraisals/{appraisalId}/photos
 */
export const useGetGalleryPhotos = (params: GetGalleryPhotosParams) => {
  return useQuery({
    queryKey: ['gallery-photos', params],
    queryFn: async (): Promise<GetGalleryPhotosResponse> => {
      // TODO: Replace with actual API call
      // const { data } = await axios.get(`/appraisals/${params.appraisalId}/photos`, { params });
      // return data;

      // Mock empty response for development
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        photos: [],
        totalCount: 0,
        pageNumber: params.pageNumber || 0,
        pageSize: params.pageSize || 20,
      };
    },
    enabled: !!params.appraisalId,
  });
};

/**
 * Hook for deleting a photo
 * DELETE /photos/{photoId}
 */
export const useDeletePhoto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_photoId: string): Promise<DeletePhotoResponse> => {
      // TODO: Replace with actual API call
      // const { data } = await axios.delete(`/photos/${photoId}`);
      // return data;

      await new Promise(resolve => setTimeout(resolve, 200));
      return { isSuccess: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-photos'] });
    },
  });
};

/**
 * Hook for updating a photo
 * PUT /photos/{photoId}
 */
export const useUpdatePhoto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: UpdatePhotoRequest): Promise<UpdatePhotoResponse> => {
      // TODO: Replace with actual API call
      // const { data } = await axios.put(`/photos/${request.photoId}`, request);
      // return data;

      await new Promise(resolve => setTimeout(resolve, 200));
      return {
        isSuccess: true,
        photo: {
          id: request.photoId,
          appraisalId: '',
          topicId: request.topicId || '',
          fileName: '',
          originalFileName: '',
          description: request.description,
          category: request.category || 'other',
          filePath: '',
          fileSize: 0,
          mimeType: '',
          isUsed: false,
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'current-user',
        },
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-photos'] });
    },
  });
};

/**
 * Hook for assigning photos to a collateral
 * POST /collaterals/{collateralId}/photos
 */
export const useAssignPhotosToCollateral = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: AssignPhotosToCollateralRequest
    ): Promise<AssignPhotosToCollateralResponse> => {
      // TODO: Replace with actual API call
      // const { data } = await axios.post(`/collaterals/${request.collateralId}/photos`, {
      //   photoIds: request.photoIds,
      // });
      // return data;

      await new Promise(resolve => setTimeout(resolve, 200));
      return {
        isSuccess: true,
        assignedCount: request.photoIds.length,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-photos'] });
      queryClient.invalidateQueries({ queryKey: ['collateral'] });
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
