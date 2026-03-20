import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import ActionBar from '@shared/components/ActionBar';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import UnsavedChangesDialog from '@shared/components/UnsavedChangesDialog';
import { useUnsavedChangesWarning } from '@/shared/hooks/useUnsavedChangesWarning';
import Section from '@shared/components/sections/Section';
import clsx from 'clsx';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import { FormFields, type FormField } from '@/shared/components/form';
import { PhotoGridView } from '../components/gallery';
import PhotoPreviewModal, { type PreviewablePhoto } from '../components/PhotoPreviewModal';
import PhotoSourceModal from '../components/PhotoSourceModal';
import GallerySelectionModal from '../components/GallerySelectionModal';
import type { GalleryImage } from '../types/gallery';
import { toGalleryImage } from '../types/gallery';
import { useGetLawAndRegulations, useSaveLawAndRegulations } from '../api/lawAndRegulation';
import { useGetGalleryPhotos, useAddGalleryPhoto, useUpdateGalleryPhoto } from '../api/gallery';
import { createUploadSession, useUploadDocument } from '@features/request/api/documents';
import type {
  LawAndRegulationImageInputType,
  LawAndRegulationItemInputType,
  GalleryPhotoDtoType,
} from '@shared/schemas/v1';
import {
  createLawAndRegulationForm,
  createLawAndRegulationFormDefault,
  type CreateLawAndRegulationFormType,
} from '../schemas/lawAndRegulation';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';

const LAW_HEADER_GROUP = 'Header';

interface LocalImage {
  id: string | null;
  galleryPhotoId: string;
  displaySequence: number;
  title: string | null;
  description: string | null;
}

const formFields: FormField[] = [
  {
    type: 'dropdown',
    label: 'Header',
    name: 'headerCode',
    group: LAW_HEADER_GROUP,
    required: true,
  },
  {
    type: 'textarea',
    label: 'Laws and Regulations',
    name: 'remark',
    maxLength: 4000,
    showCharCount: true,
    className: 'min-h-[240px]',
  },
];

const CreateLawAndRegulationPage = () => {
  const isReadOnly = usePageReadOnly();
  const navigate = useNavigate();
  const { appraisalId, itemId } = useParams<{ appraisalId: string; itemId?: string }>();
  const isEditMode = Boolean(itemId);

  // RHF + Zod
  const methods = useForm<CreateLawAndRegulationFormType>({
    defaultValues: createLawAndRegulationFormDefault,
    resolver: zodResolver(createLawAndRegulationForm),
  });

  const { formState: { isDirty } } = methods;
  const { blocker, skipWarning } = useUnsavedChangesWarning(isDirty);

  // Image & UI state
  const [images, setImages] = useState<LocalImage[]>([]);
  const [saveAction, setSaveAction] = useState<'draft' | 'submit' | null>(null);

  // Preview state
  const [previewPhoto, setPreviewPhoto] = useState<PreviewablePhoto | null>(null);

  // Modal state
  const [showPhotoSourceModal, setShowPhotoSourceModal] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{ galleryPhotoId: string; fileName: string } | null>(null);

  // Drag-and-drop state
  const [isDragging, setIsDragging] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const dragCounterRef = useRef(0);

  // API
  const { data, isLoading } = useGetLawAndRegulations(appraisalId);
  const { data: galleryData } = useGetGalleryPhotos(appraisalId);
  const saveMutation = useSaveLawAndRegulations();
  const uploadMutation = useUploadDocument();
  const { mutateAsync: addGalleryPhoto } = useAddGalleryPhoto();
  const { mutateAsync: updateGalleryPhotoApi, isPending: isUpdatingDescription } = useUpdateGalleryPhoto();

  // DTO map for gallery update calls
  const galleryPhotoDtoMap = useMemo(() => {
    const map = new Map<string, GalleryPhotoDtoType>();
    if (galleryData?.photos) {
      for (const dto of galleryData.photos as GalleryPhotoDtoType[]) {
        map.set(dto.id, dto);
      }
    }
    return map;
  }, [galleryData]);

  // Upload session
  const uploadSessionIdRef = useRef<string | null>(null);
  const sessionPromiseRef = useRef<Promise<string> | null>(null);

  const getOrCreateSession = useCallback(async (): Promise<string> => {
    if (uploadSessionIdRef.current) return uploadSessionIdRef.current;
    if (sessionPromiseRef.current) return sessionPromiseRef.current;

    sessionPromiseRef.current = createUploadSession()
      .then(res => {
        uploadSessionIdRef.current = res.sessionId;
        return res.sessionId;
      })
      .catch(err => {
        sessionPromiseRef.current = null;
        throw err;
      });

    return sessionPromiseRef.current;
  }, []);

  const allItems = useMemo(() => data?.items ?? [], [data]);

  // Build a map from galleryPhotoId → GalleryImage for URL resolution
  const galleryPhotoMap = useMemo(() => {
    const map = new Map<string, GalleryImage>();
    if (galleryData?.photos) {
      for (const dto of galleryData.photos as GalleryPhotoDtoType[]) {
        map.set(dto.id, toGalleryImage(dto));
      }
    }
    return map;
  }, [galleryData]);

  // Populate form in edit mode
  useEffect(() => {
    if (isEditMode && itemId && allItems.length > 0) {
      const target = allItems.find(i => i.id === itemId);
      if (target) {
        methods.reset({
          headerCode: target.headerCode,
          remark: target.remark ?? null,
        });
        setImages(
          target.images.map(img => ({
            id: img.id,
            galleryPhotoId: img.galleryPhotoId,
            displaySequence: img.displaySequence,
            title: img.title,
            description: img.description,
          })),
        );
      }
    }
  }, [isEditMode, itemId, allItems]);

  // Map LocalImage[] → GalleryImage[] for PhotoGridView
  const gridImages: GalleryImage[] = useMemo(
    () =>
      images.map((img, idx) => {
        const galleryImg = galleryPhotoMap.get(img.galleryPhotoId);
        return {
          id: img.galleryPhotoId,
          documentId: galleryImg?.documentId ?? '',
          photoNumber: idx + 1,
          src: galleryImg?.src ?? '',
          thumbnailSrc: galleryImg?.thumbnailSrc ?? '',
          alt: galleryImg?.fileName ?? `Photo ${idx + 1}`,
          fileName: galleryImg?.fileName,
          caption: galleryImg?.caption ?? null,
          description: galleryImg?.caption ?? undefined,
          photoType: 'LAW_REG',
          photoCategory: null,
          isInUse: galleryImg?.isInUse ?? false,
          latitude: null,
          longitude: null,
          capturedAt: null,
          fileExtension: galleryImg?.fileExtension,
          mimeType: galleryImg?.mimeType,
          fileSizeBytes: galleryImg?.fileSizeBytes,
        };
      }),
    [images, galleryPhotoMap],
  );

  // Map for preview modal
  const previewablePhotos: PreviewablePhoto[] = useMemo(
    () =>
      images.map(img => {
        const galleryImg = galleryPhotoMap.get(img.galleryPhotoId);
        return {
          id: img.galleryPhotoId,
          src: galleryImg?.src ?? '',
          fileName: galleryImg?.fileName,
          caption: galleryImg?.caption ?? null,
          fileExtension: galleryImg?.fileExtension,
          mimeType: galleryImg?.mimeType,
          fileSizeBytes: galleryImg?.fileSizeBytes,
        };
      }),
    [images, galleryPhotoMap],
  );

  // Upload handler — upload to gallery, then add to local images
  const handleUpload = useCallback(
    async (file: File) => {
      if (!appraisalId) return;
      try {
        const sessionId = await getOrCreateSession();
        const uploadResult = await uploadMutation.mutateAsync({
          uploadSessionId: sessionId,
          file,
          documentType: 'LAW_REG',
          documentCategory: 'support',
        });

        // Register in gallery
        const galleryResult = await addGalleryPhoto({
          appraisalId,
          documentId: uploadResult.documentId,
          photoType: 'law_regulation',
          uploadedBy: 'current-user',
          photoCategory: null,
          caption: null,
          latitude: null,
          longitude: null,
          capturedAt: null,
          photoTopicIds: null,
          fileName: uploadResult.fileName,
          filePath: uploadResult.storageUrl,
          fileExtension: file.name.includes('.') ? file.name.split('.').pop() ?? null : null,
          mimeType: file.type || null,
          fileSizeBytes: uploadResult.fileSize,
          uploadedByName: null,
        });

        setImages(prev => [
          ...prev,
          {
            id: null,
            galleryPhotoId: galleryResult.id,
            displaySequence: prev.length + 1,
            title: null,
            description: null,
          },
        ]);
        toast.success(`Uploaded "${file.name}"`);
      } catch {
        toast.error('Failed to upload image');
      }
    },
    [appraisalId, getOrCreateSession, uploadMutation, addGalleryPhoto],
  );

  // "Upload from Device" handler (via PhotoSourceModal)
  const handleUploadFromDevice = useCallback(
    (files: FileList) => {
      Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
          handleUpload(file);
        }
      });
    },
    [handleUpload],
  );

  // Keep a ref so the native drop handler always calls the latest handleUpload
  const handleUploadRef = useRef(handleUpload);
  handleUploadRef.current = handleUpload;

  // Native drag-and-drop with drag counter (no flicker on nested elements)
  useEffect(() => {
    const el = dropZoneRef.current;
    if (!el) return;

    const onDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current++;
      if (dragCounterRef.current === 1) setIsDragging(true);
    };
    const onDragOver = (e: DragEvent) => e.preventDefault();
    const onDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current--;
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
        setIsDragging(false);
      }
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDragging(false);
      const files = Array.from(e.dataTransfer?.files ?? []).filter(f => f.type.startsWith('image/'));
      if (files.length > 0) {
        toast.success(`Uploading ${files.length} file(s)...`);
        files.forEach(f => handleUploadRef.current(f));
      }
    };

    el.addEventListener('dragenter', onDragEnter);
    el.addEventListener('dragover', onDragOver);
    el.addEventListener('dragleave', onDragLeave);
    el.addEventListener('drop', onDrop);
    return () => {
      el.removeEventListener('dragenter', onDragEnter);
      el.removeEventListener('dragover', onDragOver);
      el.removeEventListener('dragleave', onDragLeave);
      el.removeEventListener('drop', onDrop);
    };
  }, []);

  // Gallery images available for selection (exclude already-added ones)
  const currentGalleryPhotoIds = useMemo(
    () => new Set(images.map(img => img.galleryPhotoId)),
    [images],
  );

  const availableGalleryImages: GalleryImage[] = useMemo(() => {
    if (!galleryData?.photos) return [];
    return (galleryData.photos as GalleryPhotoDtoType[])
      .filter(p => !currentGalleryPhotoIds.has(p.id))
      .map(toGalleryImage);
  }, [galleryData, currentGalleryPhotoIds]);

  // "Choose from Gallery" handler
  const handleGallerySelect = useCallback(
    (selectedImages: GalleryImage[]) => {
      setImages(prev => [
        ...prev,
        ...selectedImages.map((img, idx) => ({
          id: null,
          galleryPhotoId: img.id,
          displaySequence: prev.length + idx + 1,
          title: null,
          description: null,
        })),
      ]);
      if (selectedImages.length > 0) {
        toast.success(
          selectedImages.length === 1
            ? 'Photo added'
            : `${selectedImages.length} photos added`,
        );
      }
    },
    [],
  );

  // Delete handler for PhotoGridView
  const handleImageDelete = useCallback((image: GalleryImage) => {
    setDeleteTarget({ galleryPhotoId: image.id, fileName: image.fileName ?? image.alt });
  }, []);

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    setImages(prev => prev.filter(img => img.galleryPhotoId !== deleteTarget.galleryPhotoId));
    setPreviewPhoto(prev => (prev?.id === deleteTarget.galleryPhotoId ? null : prev));
    setDeleteTarget(null);
  }, [deleteTarget]);

  // Click handler for PhotoGridView (opens preview)
  const handleImageClick = useCallback((image: GalleryImage) => {
    const match = previewablePhotos.find(p => p.id === image.id);
    setPreviewPhoto(match ?? { id: image.id, src: image.src, fileName: image.fileName });
  }, [previewablePhotos]);

  // Build items array for batch save
  const buildItemsPayload = (formData: CreateLawAndRegulationFormType): LawAndRegulationItemInputType[] => {
    const currentItem: LawAndRegulationItemInputType = {
      id: isEditMode && itemId ? itemId : null,
      headerCode: formData.headerCode,
      remark: formData.remark || null,
      images: images.map(
        (img, idx): LawAndRegulationImageInputType => ({
          id: img.id,
          galleryPhotoId: img.galleryPhotoId,
          displaySequence: idx + 1,
          title: img.title,
          description: img.description,
        }),
      ),
    };

    if (isEditMode && itemId) {
      return allItems.map(i =>
        i.id === itemId
          ? currentItem
          : {
              id: i.id,
              headerCode: i.headerCode,
              remark: i.remark,
              images: i.images.map(img => ({
                id: img.id,
                galleryPhotoId: img.galleryPhotoId,
                displaySequence: img.displaySequence,
                title: img.title,
                description: img.description,
              })),
            },
      );
    }

    return [
      ...allItems.map(i => ({
        id: i.id,
        headerCode: i.headerCode,
        remark: i.remark,
        images: i.images.map(img => ({
          id: img.id,
          galleryPhotoId: img.galleryPhotoId,
          displaySequence: img.displaySequence,
          title: img.title,
          description: img.description,
        })),
      })),
      currentItem,
    ];
  };

  const navigateBack = () => navigate(`/appraisals/${appraisalId}/property?tab=laws`);

  const handleSave = (action: 'draft' | 'submit') => {
    if (!appraisalId) return;

    methods.handleSubmit((formData) => {
      setSaveAction(action);
      const items = buildItemsPayload(formData);

      saveMutation.mutate(
        { appraisalId, items },
        {
          onSuccess: () => {
            toast.success(action === 'draft' ? 'Draft saved' : 'Saved successfully');
            setSaveAction(null);
            skipWarning();
            navigateBack();
          },
          onError: () => {
            toast.error('Failed to save');
            setSaveAction(null);
          },
        },
      );
    })();
  };

  const isPending = saveMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="spinner" style="solid" className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <div className="flex flex-col h-full min-h-0">
        {/* Scrollable Form Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-smooth">
          <div className="px-4 py-6 flex flex-col gap-6">
            {/* Page title */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                <Icon name="gavel" style="solid" className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isEditMode ? 'Edit' : 'New'} Law & Regulation
              </h2>
            </div>

            <div className="h-px bg-gray-200" />

            {/* Form fields (Header dropdown + Remark textarea) */}
            <Section id="form-section">
              <div className="flex flex-col gap-6">
                <FormFields fields={formFields} />
              </div>
            </Section>

            {/* Images */}
            <Section id="images-section">
              <div ref={dropZoneRef} className="relative flex flex-col gap-4">
                <span className="block text-xs font-medium text-gray-700">Images</span>

                {/* Drag overlay */}
                <div
                  className={clsx(
                    'absolute inset-0 z-40 flex items-center justify-center border-2 border-dashed rounded-2xl transition-opacity pointer-events-none',
                    isDragging
                      ? 'opacity-100 border-primary bg-primary/5'
                      : 'opacity-0 border-transparent',
                  )}
                >
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3 animate-bounce">
                      <Icon name="cloud-arrow-down" className="text-2xl text-primary" />
                    </div>
                    <p className="text-lg font-semibold text-primary">Drop photos here</p>
                    <p className="text-sm text-primary/60 mt-1">Release to upload</p>
                  </div>
                </div>

                {/* Photo grid */}
                <PhotoGridView
                  images={gridImages}
                  onImageClick={handleImageClick}
                  onImageDelete={isReadOnly ? undefined : handleImageDelete}
                  showUsedBadge={false}
                  prepend={
                    !isReadOnly ? (
                      <div
                        onClick={() => setShowPhotoSourceModal(true)}
                        className="aspect-[4/3] rounded-xl border-2 border-dashed border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:shadow-md flex flex-col items-center justify-center cursor-pointer transition-all duration-300"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mb-3">
                          <Icon name="plus" className="text-2xl" />
                        </div>
                        <p className="text-sm font-medium text-gray-600">Add photos</p>
                        <p className="text-xs text-gray-400 mt-1">Click or drag & drop</p>
                      </div>
                    ) : undefined
                  }
                />
              </div>
            </Section>
          </div>
        </div>

        {/* Sticky Action Buttons */}
        <ActionBar>
          <ActionBar.Left>
            <Button variant="ghost" type="button" onClick={navigateBack}>
              Cancel
            </Button>
            {!isReadOnly && (
              <>
                <ActionBar.Divider />
                <ActionBar.UnsavedIndicator show={isDirty} />
              </>
            )}
          </ActionBar.Left>
          {!isReadOnly && (
            <ActionBar.Right>
              <Button
                variant="ghost"
                type="button"
                onClick={() => handleSave('draft')}
                isLoading={isPending && saveAction === 'draft'}
                disabled={isPending}
              >
                <Icon name="floppy-disk" style="regular" className="size-4 mr-2" />
                Save draft
              </Button>
              <Button
                type="button"
                onClick={() => handleSave('submit')}
                isLoading={isPending && saveAction === 'submit'}
                disabled={isPending}
              >
                <Icon name="check" style="solid" className="size-4 mr-2" />
                Save
              </Button>
            </ActionBar.Right>
          )}
        </ActionBar>

        {/* Delete Confirmation */}
        <ConfirmDialog
          isOpen={deleteTarget !== null}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
          title="Delete Image"
          message={`Are you sure you want to delete "${deleteTarget?.fileName}"? This action cannot be undone.`}
          confirmText="Delete"
          variant="danger"
        />

        {/* Photo Source Modal (Upload or Gallery) */}
        <PhotoSourceModal
          isOpen={showPhotoSourceModal}
          onClose={() => setShowPhotoSourceModal(false)}
          onUploadFromDevice={handleUploadFromDevice}
          onChooseFromGallery={() => setShowGalleryModal(true)}
        />

        {/* Gallery Selection Modal */}
        <GallerySelectionModal
          isOpen={showGalleryModal}
          onClose={() => setShowGalleryModal(false)}
          onSelect={handleGallerySelect}
          images={availableGalleryImages}
          multiSelect
        />

        <UnsavedChangesDialog blocker={blocker} />

        {/* Photo Preview Modal */}
        {previewPhoto && (
          <PhotoPreviewModal
            photo={previewPhoto}
            photos={previewablePhotos}
            onClose={() => setPreviewPhoto(null)}
            onNavigate={setPreviewPhoto}
            showInUseStatus={false}
            onDelete={isReadOnly ? undefined : () => {
              setDeleteTarget({
                galleryPhotoId: previewPhoto.id,
                fileName: previewPhoto.fileName ?? 'this image',
              });
            }}
            onSaveDescription={isReadOnly ? undefined : async (caption: string) => {
              if (!appraisalId) return;
              try {
                const dto = galleryPhotoDtoMap.get(previewPhoto.id);
                await updateGalleryPhotoApi({
                  appraisalId,
                  photoId: previewPhoto.id,
                  caption: caption || null,
                  photoCategory: dto?.photoCategory ?? null,
                  latitude: dto?.latitude ?? null,
                  longitude: dto?.longitude ?? null,
                  capturedAt: dto?.capturedAt ?? null,
                });
                setPreviewPhoto(prev =>
                  prev ? { ...prev, caption: caption || null } : null,
                );
                toast.success('Description updated');
              } catch {
                toast.error('Failed to update description');
              }
            }}
            isSavingDescription={isUpdatingDescription}
          />
        )}
      </div>
    </FormProvider>
  );
};

export default CreateLawAndRegulationPage;
