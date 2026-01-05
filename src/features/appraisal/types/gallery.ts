export type GalleryViewMode = 'grid' | 'list' | 'display';

export interface CollateralUsage {
  collateralId: string;
  collateralName: string;
  collateralType: 'land' | 'building' | 'condo' | 'land-building';
  topicName: string;
}

export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  fileName?: string;
  description?: string;
  propertyType?: string;
  groupName?: string;
  category?: string;
  size?: number;
  uploadedAt?: Date;
  isUsed?: boolean;
  usedInCollaterals?: CollateralUsage[];
}

export interface GalleryViewProps {
  images: GalleryImage[];
  onImageClick?: (image: GalleryImage) => void;
  onImageDelete?: (image: GalleryImage) => void;
  onImageEdit?: (image: GalleryImage) => void;
  selectedImageIds?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
}
