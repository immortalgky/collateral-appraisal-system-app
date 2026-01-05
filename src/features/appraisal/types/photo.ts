// Photo Types for Appraisal Module

export type PhotoCategory = 'exterior' | 'interior' | 'documents' | 'other';

export interface PhotoTopic {
  id: string;
  appraisalId: string;
  name: string;
  layout: 1 | 2 | 3;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Photo {
  id: string;
  appraisalId: string;
  topicId: string;
  fileName: string;
  originalFileName: string;
  description?: string;
  category: PhotoCategory;
  filePath: string;
  thumbnailPath?: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  isUsed: boolean;
  usedInCollateralIds?: string[];
  uploadedAt: string;
  uploadedBy: string;
  uploadedByName?: string;
}

export interface GalleryPhotoItem {
  id: string;
  src: string;
  thumbnailSrc?: string;
  alt: string;
  fileName: string;
  description?: string;
  category: PhotoCategory;
  topicId?: string;
  topicName?: string;
  fileSize: number;
  isUsed: boolean;
  uploadedAt: string;
}

// API Request/Response Types

export interface CreatePhotoTopicRequest {
  appraisalId: string;
  name: string;
  layout?: 1 | 2 | 3;
}

export interface CreatePhotoTopicResponse {
  isSuccess: boolean;
  topic: PhotoTopic;
}

export interface UpdatePhotoTopicRequest {
  topicId: string;
  name?: string;
  layout?: 1 | 2 | 3;
  order?: number;
}

export interface UpdatePhotoTopicResponse {
  isSuccess: boolean;
  topic: PhotoTopic;
}

export interface DeletePhotoTopicResponse {
  isSuccess: boolean;
}

export interface GetPhotoTopicsResponse {
  topics: PhotoTopic[];
}

export interface CreatePhotoUploadSessionRequest {
  appraisalId: string;
}

export interface CreatePhotoUploadSessionResponse {
  sessionId: string;
  expiresAt: string;
}

export interface UploadPhotoRequest {
  sessionId: string;
  file: File;
  topicId: string;
  category: PhotoCategory;
  description?: string;
}

export interface UploadPhotoResponse {
  isSuccess: boolean;
  photo: Photo;
}

export interface GetGalleryPhotosParams {
  appraisalId: string;
  topicId?: string;
  category?: PhotoCategory;
  isUsed?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

export interface GetGalleryPhotosResponse {
  photos: Photo[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface DeletePhotoResponse {
  isSuccess: boolean;
}

export interface UpdatePhotoRequest {
  photoId: string;
  description?: string;
  category?: PhotoCategory;
  topicId?: string;
}

export interface UpdatePhotoResponse {
  isSuccess: boolean;
  photo: Photo;
}

export interface AssignPhotosToCollateralRequest {
  photoIds: string[];
  collateralId: string;
}

export interface AssignPhotosToCollateralResponse {
  isSuccess: boolean;
  assignedCount: number;
}

// Photo Layout Configuration
export interface PhotoLayoutConfig {
  topicId: string;
  columns: 1 | 2 | 3;
  photosPerPage?: number;
}

// Default Photo Topics (legacy - appraisal level)
export const DEFAULT_PHOTO_TOPICS = [
  'Area in front of the project',
  'Area in front of the collateral',
  'Collateral',
  'Interior',
  'Surrounding area',
  'Access road',
] as const;

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
