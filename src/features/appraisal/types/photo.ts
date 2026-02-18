// Photo Types for Appraisal Module

export type PhotoCategory = 'exterior' | 'interior' | 'documents' | 'other';

// Collateral Types
export type CollateralType = 'land' | 'building' | 'condo' | 'land-building';

// Collateral-Level Photo Topic
export interface CollateralPhotoTopic {
  id: string;
  collateralId: string;
  collateralType: CollateralType;
  name: string;
  layout: 1 | 2 | 3;
  order: number;
  createdAt: string;
  updatedAt: string;
}

// Collateral Photo - links gallery photo to collateral topic
export interface CollateralPhoto {
  id: string;
  galleryPhotoId: string;
  collateralId: string;
  topicId: string;
  order: number;
  // Denormalized from gallery photo for convenience
  src: string;
  thumbnailSrc?: string;
  fileName: string;
  description?: string;
}

// Type-specific default topics
export const DEFAULT_TOPICS_BY_TYPE: Record<CollateralType, string[]> = {
  land: ['Area surroundings', 'Land boundary', 'Title deed', 'Access road'],
  building: ['Building exterior', 'Interior rooms', 'Structure details', 'Utilities'],
  condo: ['Unit interior', 'Common areas', 'Building exterior', 'Facilities'],
  'land-building': ['Land area', 'Building exterior', 'Interior', 'Surroundings'],
};

// Collateral Photo API Request/Response Types

export interface GetCollateralPhotoTopicsParams {
  collateralId: string;
}

export interface GetCollateralPhotoTopicsResponse {
  topics: CollateralPhotoTopic[];
}

export interface CreateCollateralPhotoTopicRequest {
  collateralId: string;
  collateralType: CollateralType;
  name: string;
  layout?: 1 | 2 | 3;
}

export interface CreateCollateralPhotoTopicResponse {
  isSuccess: boolean;
  topic: CollateralPhotoTopic;
}

export interface UpdateCollateralPhotoTopicRequest {
  topicId: string;
  name?: string;
  layout?: 1 | 2 | 3;
  order?: number;
}

export interface UpdateCollateralPhotoTopicResponse {
  isSuccess: boolean;
  topic: CollateralPhotoTopic;
}

export interface DeleteCollateralPhotoTopicResponse {
  isSuccess: boolean;
}

export interface GetCollateralPhotosParams {
  collateralId: string;
  topicId?: string;
}

export interface GetCollateralPhotosResponse {
  photos: CollateralPhoto[];
}

export interface AddPhotoToCollateralRequest {
  collateralId: string;
  galleryPhotoId: string;
  topicId: string;
}

export interface AddPhotoToCollateralResponse {
  isSuccess: boolean;
  photo: CollateralPhoto;
}

export interface RemovePhotoFromCollateralResponse {
  isSuccess: boolean;
}

export interface ReorderCollateralPhotosRequest {
  collateralId: string;
  topicId: string;
  photoIds: string[];
}

export interface ReorderCollateralPhotosResponse {
  isSuccess: boolean;
}

// Photo Category Options
export const PHOTO_CATEGORIES: { value: PhotoCategory; label: string }[] = [
  { value: 'exterior', label: 'Exterior' },
  { value: 'interior', label: 'Interior' },
  { value: 'documents', label: 'Documents' },
  { value: 'other', label: 'Other' },
];

// Layout Options
export const LAYOUT_OPTIONS: { value: 1 | 2 | 3; label: string }[] = [
  { value: 1, label: '1 Column' },
  { value: 2, label: '2 Columns' },
  { value: 3, label: '3 Columns' },
];
