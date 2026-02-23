import type { GalleryPhotoDtoType, TopicPhotoDtoType } from '@shared/schemas/v1';

export type GalleryViewMode = 'grid' | 'list' | 'display';

export interface GalleryImage {
  id: string;
  documentId: string;
  photoNumber: number;
  src: string;
  thumbnailSrc: string;
  alt: string;
  fileName?: string;
  caption: string | null;
  description?: string;
  photoType: string;
  photoCategory: string | null;
  category?: string;
  uploadedAt?: Date;
  isUsedInReport: boolean;
  isUsed?: boolean;
  reportSection: string | null;
  latitude: number | null;
  longitude: number | null;
  capturedAt: string | null;
}

export interface GalleryViewProps {
  images: GalleryImage[];
  onImageClick?: (image: GalleryImage) => void;
  onImageDelete?: (image: GalleryImage) => void;
  onImageEdit?: (image: GalleryImage) => void;
  selectedImageIds?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Convert a GalleryPhotoDto from the API into a GalleryImage for the UI.
 * The `src` is constructed from VITE_API_URL + documentId download endpoint.
 */
export const toGalleryImage = (dto: GalleryPhotoDtoType): GalleryImage => ({
  id: dto.id,
  documentId: dto.documentId,
  photoNumber: dto.photoNumber,
  src: `${API_BASE_URL}/documents/${dto.documentId}/download?download=false`,
  thumbnailSrc: `${API_BASE_URL}/documents/${dto.documentId}/download?download=false&size=large`,
  alt: dto.caption || `Photo #${dto.photoNumber}`,
  fileName: `Photo_${dto.photoNumber}`,
  caption: dto.caption,
  description: dto.caption ?? undefined,
  photoType: dto.photoType,
  photoCategory: dto.photoCategory,
  category: dto.photoCategory ?? undefined,
  uploadedAt: new Date(dto.uploadedAt),
  isUsedInReport: dto.isUsedInReport,
  isUsed: dto.isUsedInReport,
  reportSection: dto.reportSection,
  latitude: dto.latitude,
  longitude: dto.longitude,
  capturedAt: dto.capturedAt,
});

export interface TopicPhotoDisplay {
  id: string;
  documentId: string;
  photoNumber: number;
  caption: string | null;
  src: string;
  thumbnailSrc: string;
  fileName: string;
}

export const toTopicPhotoDisplay = (dto: TopicPhotoDtoType): TopicPhotoDisplay => ({
  id: dto.id,
  documentId: dto.documentId,
  photoNumber: dto.photoNumber,
  caption: dto.caption,
  src: `${API_BASE_URL}/documents/${dto.documentId}/download?download=false`,
  thumbnailSrc: `${API_BASE_URL}/documents/${dto.documentId}/download?download=false&size=large`,
  fileName: dto.caption || `Photo #${dto.photoNumber}`,
});
