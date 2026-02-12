import { useState, useRef, useCallback, useMemo } from 'react';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useParams } from 'react-router-dom';
import { useEnrichedPropertyGroups } from '../../hooks/useEnrichedPropertyGroups';
import ViewModeToggle, { type GalleryViewMode } from '../ViewModeToggle';
import { PhotoGridView, PhotoListView, PhotoDisplayView } from '../gallery';
import type { GalleryImage } from '../../types/gallery';
import {
  useCreatePhotoUploadSession,
  useUploadPhoto,
  useDeletePhoto,
  useAssignPhotosToCollateral,
} from '../../api/photo';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import CollateralAssignmentModal from '../CollateralAssignmentModal';

type SortOption = 'newest' | 'oldest' | 'name' | 'size';
type FilterStatus = 'all' | 'used' | 'unused';

// Statistics Card Component
const StatCard = ({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: string;
  color: 'blue' | 'green' | 'orange' | 'gray';
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    gray: 'bg-gray-50 text-gray-600',
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100">
      <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', colorClasses[color])}>
        <Icon name={icon} className="text-lg" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
};

// Filter Chip Component
const FilterChip = ({
  label,
  isActive,
  count,
  onClick,
}: {
  label: string;
  isActive: boolean;
  count?: number;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={clsx(
      'px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2',
      isActive
        ? 'bg-primary text-white shadow-sm'
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    )}
  >
    {label}
    {count !== undefined && (
      <span
        className={clsx(
          'px-1.5 py-0.5 rounded-full text-xs',
          isActive ? 'bg-white/20' : 'bg-gray-200'
        )}
      >
        {count}
      </span>
    )}
  </button>
);

// Bulk Action Toolbar Component
const BulkActionToolbar = ({
  selectedCount,
  onDelete,
  onAssign,
  onDeselect,
}: {
  selectedCount: number;
  onDelete: () => void;
  onAssign: () => void;
  onDeselect: () => void;
}) => (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
    <div className="flex items-center gap-4 px-6 py-3 bg-gray-900 text-white rounded-full shadow-xl">
      <span className="text-sm font-medium">
        {selectedCount} {selectedCount === 1 ? 'photo' : 'photos'} selected
      </span>
      <div className="w-px h-5 bg-gray-700" />
      <button
        type="button"
        onClick={onAssign}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 transition-colors text-sm font-medium"
      >
        <Icon name="link" className="text-xs" />
        Assign to Collateral
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 transition-colors text-sm font-medium"
      >
        <Icon name="trash" className="text-xs" />
        Delete
      </button>
      <button
        type="button"
        onClick={onDeselect}
        className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
      >
        <Icon name="xmark" className="text-sm" />
      </button>
    </div>
  </div>
);

// Empty State Component
const EmptyGalleryState = ({ onUpload }: { onUpload: () => void }) => (
  <div className="flex flex-col items-center justify-center py-16">
    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
      <Icon name="image" className="text-3xl text-gray-400" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">No photos yet</h3>
    <p className="text-sm text-gray-500 mb-6 text-center max-w-sm">
      Upload photos from your device or drag and drop them here to get started.
    </p>
    <Button variant="primary" onClick={onUpload}>
      <Icon name="cloud-arrow-up" className="mr-2" />
      Upload Photos
    </Button>
  </div>
);

export const GalleryTab = () => {
  const { appraisalId } = useParams<{ appraisalId: string }>();
  const { groups } = useEnrichedPropertyGroups(appraisalId);
  const [viewMode, setViewMode] = useState<GalleryViewMode>('grid');
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [uploadingPhotos, setUploadingPhotos] = useState<Map<string, { file: File; progress: number }>>(new Map());
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; photoId: string | null }>({ isOpen: false, photoId: null });
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadSessionIdRef = useRef<string | null>(null);
  const sessionPromiseRef = useRef<Promise<string> | null>(null);

  // API hooks
  const { mutateAsync: createUploadSession } = useCreatePhotoUploadSession();
  const { mutate: uploadPhoto } = useUploadPhoto();
  const { mutate: deletePhoto, isPending: isDeleting } = useDeletePhoto();
  const { mutate: assignPhotos, isPending: isAssigning } = useAssignPhotosToCollateral();

  // Mock appraisal ID (in real app, get from context/params)


  /**
   * Get or create an upload session for photo uploads.
   * Ensures only one session is created per page load.
   */
  const getOrCreateSession = useCallback(async (): Promise<string> => {
    if (uploadSessionIdRef.current) {
      return uploadSessionIdRef.current;
    }

    if (sessionPromiseRef.current) {
      return sessionPromiseRef.current;
    }

    sessionPromiseRef.current = createUploadSession(appraisalId!)
      .then(response => {
        uploadSessionIdRef.current = response.sessionId;
        return response.sessionId;
      })
      .catch(error => {
        sessionPromiseRef.current = null;
        throw error;
      });

    return sessionPromiseRef.current;
  }, [createUploadSession, appraisalId]);

  // Collect all images from all properties
  const allImages: GalleryImage[] = useMemo(
    () =>
      groups.flatMap(group =>
        group.items
          .filter(item => item.image)
          .map(item => ({
            id: item.id,
            src: item.image!,
            alt: item.address,
            fileName: `${item.type}_${item.id}.jpg`,
            description: item.address,
            propertyType: item.type,
            groupName: group.name,
            isUsed: false,
            size: Math.floor(Math.random() * 5000000) + 100000, // Mock file size
            uploadedAt: new Date(),
          }))
      ),
    [groups]
  );

  // Filter and sort images
  const filteredImages = useMemo(() => {
    let result = [...allImages];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        img =>
          img.fileName?.toLowerCase().includes(query) ||
          img.description?.toLowerCase().includes(query) ||
          img.groupName?.toLowerCase().includes(query)
      );
    }

    // Filter by status - includes both isUsed and usedInCollaterals
    if (filterStatus === 'used') {
      result = result.filter(img => img.isUsed || (img.usedInCollaterals && img.usedInCollaterals.length > 0));
    } else if (filterStatus === 'unused') {
      result = result.filter(img => !img.isUsed && (!img.usedInCollaterals || img.usedInCollaterals.length === 0));
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => (b.uploadedAt?.getTime() || 0) - (a.uploadedAt?.getTime() || 0));
        break;
      case 'oldest':
        result.sort((a, b) => (a.uploadedAt?.getTime() || 0) - (b.uploadedAt?.getTime() || 0));
        break;
      case 'name':
        result.sort((a, b) => (a.fileName || '').localeCompare(b.fileName || ''));
        break;
      case 'size':
        result.sort((a, b) => (b.size || 0) - (a.size || 0));
        break;
    }

    return result;
  }, [allImages, searchQuery, filterStatus, sortBy]);

  // Statistics - includes both isUsed and usedInCollaterals
  const stats = useMemo(
    () => ({
      total: allImages.length,
      used: allImages.filter(img => img.isUsed || (img.usedInCollaterals && img.usedInCollaterals.length > 0)).length,
      unused: allImages.filter(img => !img.isUsed && (!img.usedInCollaterals || img.usedInCollaterals.length === 0)).length,
    }),
    [allImages]
  );

  const handleImageClick = (image: GalleryImage) => {
    setSelectedImage(image);
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
  };

  const handleNavigate = (image: GalleryImage) => {
    setSelectedImage(image);
  };

  const handleImageDelete = (image: GalleryImage) => {
    setDeleteConfirm({ isOpen: true, photoId: image.id });
  };

  const confirmSingleDelete = () => {
    if (!deleteConfirm.photoId) return;

    deletePhoto(deleteConfirm.photoId, {
      onSuccess: () => {
        toast.success('Photo deleted successfully');
        setDeleteConfirm({ isOpen: false, photoId: null });
      },
      onError: () => {
        toast.error('Failed to delete photo');
      },
    });
  };

  const handleImageEdit = (image: GalleryImage) => {
    // TODO: Open edit modal
    console.log('Edit image:', image.id);
    toast.success('Edit feature coming soon');
  };

  const handleBulkDelete = () => {
    if (selectedImageIds.size === 0) return;
    setBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = () => {
    const idsToDelete = Array.from(selectedImageIds);
    let deletedCount = 0;
    let failedCount = 0;

    idsToDelete.forEach(id => {
      deletePhoto(id, {
        onSuccess: () => {
          deletedCount++;
          if (deletedCount + failedCount === idsToDelete.length) {
            if (failedCount === 0) {
              toast.success(`Deleted ${deletedCount} photo(s)`);
            } else {
              toast.error(`Deleted ${deletedCount}, failed ${failedCount}`);
            }
            setSelectedImageIds(new Set());
            setBulkDeleteConfirm(false);
          }
        },
        onError: () => {
          failedCount++;
          if (deletedCount + failedCount === idsToDelete.length) {
            toast.error(`Deleted ${deletedCount}, failed ${failedCount}`);
            setSelectedImageIds(new Set());
            setBulkDeleteConfirm(false);
          }
        },
      });
    });
  };

  const handleBulkAssign = () => {
    if (selectedImageIds.size === 0) {
      toast.error('Please select at least one photo');
      return;
    }
    setAssignModalOpen(true);
  };

  const handleAssignToCollateral = (collateralId: string) => {
    const photoIds = Array.from(selectedImageIds);

    assignPhotos(
      { collateralId, photoIds },
      {
        onSuccess: (response) => {
          toast.success(`Assigned ${response.assignedCount} photo(s) to collateral`);
          setSelectedImageIds(new Set());
          setAssignModalOpen(false);
        },
        onError: () => {
          toast.error('Failed to assign photos');
        },
      }
    );
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  /**
   * Upload a single file
   */
  const uploadSingleFile = useCallback(async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(`${file.name} is not an image file`);
      return;
    }

    // Generate temporary ID for tracking
    const tempId = `uploading-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Add to uploading state
    setUploadingPhotos(prev => new Map(prev).set(tempId, { file, progress: 0 }));

    try {
      const sessionId = await getOrCreateSession();

      uploadPhoto(
        {
          sessionId,
          file,
          topicId: '', // Will be assigned later
          category: 'other',
        },
        {
          onSuccess: () => {
            setUploadingPhotos(prev => {
              const next = new Map(prev);
              next.delete(tempId);
              return next;
            });
            toast.success(`Uploaded ${file.name}`);
          },
          onError: () => {
            setUploadingPhotos(prev => {
              const next = new Map(prev);
              next.delete(tempId);
              return next;
            });
            toast.error(`Failed to upload ${file.name}`);
          },
        }
      );
    } catch {
      setUploadingPhotos(prev => {
        const next = new Map(prev);
        next.delete(tempId);
        return next;
      });
      toast.error('Failed to create upload session');
    }
  }, [getOrCreateSession, uploadPhoto]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);

    if (files.length === 0) return;

    toast.success(`Uploading ${files.length} file(s)...`);
    files.forEach(file => uploadSingleFile(file));
  }, [uploadSingleFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    toast.success(`Uploading ${fileArray.length} file(s)...`);
    fileArray.forEach(file => uploadSingleFile(file));

    // Reset input
    e.target.value = '';
  }, [uploadSingleFile]);

  const handleSelectAll = () => {
    if (selectedImageIds.size === filteredImages.length) {
      setSelectedImageIds(new Set());
    } else {
      setSelectedImageIds(new Set(filteredImages.map(img => img.id)));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Photo Gallery</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage all photos for this appraisal
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Icon name="cloud-arrow-up" className="mr-2" />
          Upload Photos
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Photos" value={stats.total} icon="image" color="blue" />
        <StatCard label="Used in Collaterals" value={stats.used} icon="check-circle" color="green" />
        <StatCard label="Unused" value={stats.unused} icon="clock" color="orange" />
      </div>

      {/* Upload Progress */}
      {uploadingPhotos.size > 0 && (
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <Icon name="spinner" style="solid" className="text-blue-600 animate-spin" />
            <span className="text-sm font-medium text-blue-900">
              Uploading {uploadingPhotos.size} file{uploadingPhotos.size !== 1 ? 's' : ''}...
            </span>
          </div>
          <div className="space-y-2">
            {Array.from(uploadingPhotos.entries()).map(([id, { file }]) => (
              <div key={id} className="flex items-center gap-3 text-sm text-blue-700">
                <Icon name="file-image" className="text-blue-500" />
                <span className="truncate flex-1">{file.name}</span>
                <span className="text-xs text-blue-500">Processing...</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col gap-4 p-4 bg-gray-50 rounded-xl">
        {/* Top Row: Search and View Toggle */}
        <div className="flex items-center justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Icon name="magnifying-glass" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search photos..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <Icon name="xmark" />
              </button>
            )}
          </div>

          {/* View Mode and Sort */}
          <div className="flex items-center gap-3">
            <ViewModeToggle mode={viewMode} onChange={setViewMode} />

            <div className="w-px h-6 bg-gray-200" />

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Sort:</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortOption)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="name">Name</option>
                <option value="size">Size</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bottom Row: Filter Chips */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FilterChip
              label="All"
              isActive={filterStatus === 'all'}
              count={stats.total}
              onClick={() => setFilterStatus('all')}
            />
            <FilterChip
              label="Used"
              isActive={filterStatus === 'used'}
              count={stats.used}
              onClick={() => setFilterStatus('used')}
            />
            <FilterChip
              label="Unused"
              isActive={filterStatus === 'unused'}
              count={stats.unused}
              onClick={() => setFilterStatus('unused')}
            />
          </div>

          {/* Select All */}
          {filteredImages.length > 0 && (
            <button
              type="button"
              onClick={handleSelectAll}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <div
                className={clsx(
                  'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                  selectedImageIds.size === filteredImages.length && filteredImages.length > 0
                    ? 'bg-primary border-primary'
                    : 'border-gray-300 hover:border-primary'
                )}
              >
                {selectedImageIds.size === filteredImages.length && filteredImages.length > 0 && (
                  <Icon name="check" className="text-xs text-white" />
                )}
              </div>
              Select All
            </button>
          )}
        </div>
      </div>

      {/* Drop Zone (when dragging) */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-12 shadow-2xl border-2 border-dashed border-primary">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Icon name="cloud-arrow-down" className="text-3xl text-primary" />
              </div>
              <p className="text-xl font-semibold text-gray-900">Drop photos here</p>
              <p className="text-sm text-gray-500 mt-2">Release to upload</p>
            </div>
          </div>
        </div>
      )}

      {/* Gallery Content */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="min-h-[400px]"
      >
        {filteredImages.length === 0 ? (
          searchQuery || filterStatus !== 'all' ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Icon name="magnifying-glass" className="text-2xl text-gray-400" />
              </div>
              <p className="text-lg font-medium text-gray-900 mb-2">No results found</p>
              <p className="text-sm text-gray-500 mb-4">
                Try adjusting your search or filter criteria
              </p>
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchQuery('');
                  setFilterStatus('all');
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <EmptyGalleryState onUpload={() => fileInputRef.current?.click()} />
          )
        ) : (
          <>
            {viewMode === 'grid' && (
              <PhotoGridView
                images={filteredImages}
                onImageClick={handleImageClick}
                onImageDelete={handleImageDelete}
                selectedImageIds={selectedImageIds}
                onSelectionChange={setSelectedImageIds}
                showUsedBadge
              />
            )}

            {viewMode === 'list' && (
              <PhotoListView
                images={filteredImages}
                onImageClick={handleImageClick}
                onImageDelete={handleImageDelete}
                onImageEdit={handleImageEdit}
                selectedImageIds={selectedImageIds}
                onSelectionChange={setSelectedImageIds}
                showUsedBadge
              />
            )}
          </>
        )}
      </div>

      {/* Results Count */}
      {filteredImages.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-100">
          <p>
            Showing {filteredImages.length} of {allImages.length} photos
          </p>
          {searchQuery && (
            <p>
              Results for "{searchQuery}"
            </p>
          )}
        </div>
      )}

      {/* Bulk Action Toolbar */}
      {selectedImageIds.size > 0 && (
        <BulkActionToolbar
          selectedCount={selectedImageIds.size}
          onDelete={handleBulkDelete}
          onAssign={handleBulkAssign}
          onDeselect={() => setSelectedImageIds(new Set())}
        />
      )}

      {/* Display Modal */}
      {selectedImage && (
        <PhotoDisplayView
          image={selectedImage}
          images={filteredImages}
          onClose={handleCloseModal}
          onNavigate={handleNavigate}
          onDelete={handleImageDelete}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, photoId: null })}
        onConfirm={confirmSingleDelete}
        title="Delete Photo"
        message="Are you sure you want to delete this photo? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={confirmBulkDelete}
        title="Delete Selected Photos"
        message={`Are you sure you want to delete ${selectedImageIds.size} selected photo(s)? This action cannot be undone.`}
        confirmText="Delete All"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Collateral Assignment Modal */}
      <CollateralAssignmentModal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        onAssign={handleAssignToCollateral}
        selectedCount={selectedImageIds.size}
        isLoading={isAssigning}
      />
    </div>
  );
};

export default GalleryTab;
