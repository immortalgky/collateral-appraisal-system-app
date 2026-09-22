import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { arrayMove } from '@dnd-kit/sortable';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useBasePath, useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import useBreadcrumbExtras from '@/shared/hooks/useBreadcrumbExtras';
import { useParameterDescription } from '@shared/utils/parameterUtils';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import ActionBar from '@shared/components/ActionBar';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import UnsavedChangesDialog from '@shared/components/UnsavedChangesDialog';
import { useUnsavedChangesWarning } from '@/shared/hooks/useUnsavedChangesWarning';
import { FormFields, type FormField } from '@/shared/components/form';
import { LawImagesPanel, type LawPanelImage, CAPTION_MAX } from '../components/LawImagesPanel';
import PhotoPreviewModal, { type PreviewablePhoto } from '../components/PhotoPreviewModal';
import GallerySelectionModal from '../components/GallerySelectionModal';
import type { GalleryImage } from '../types/gallery';
import { toGalleryImage } from '../types/gallery';
import { useGetLawAndRegulations, useSaveLawAndRegulations } from '../api/lawAndRegulation';
import { useGetGalleryPhotos, useAddGalleryPhoto } from '../api/gallery';
import { createUploadSession, useUploadDocument } from '@features/request/api/documents';
import type {
  LawAndRegulationImageInputType,
  LawAndRegulationItemInputType,
  GalleryPhotoDtoType,
} from '@shared/schemas/v1';
import {
  useCreateLawAndRegulationFormSchema,
  createLawAndRegulationFormDefault,
  type CreateLawAndRegulationFormType,
} from '../schemas/lawAndRegulation';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useAuthStore } from '@features/auth/store';

const LAW_HEADER_GROUP = 'Header';

interface LocalImage {
  id: string | null;
  galleryPhotoId: string;
  displaySequence: number;
  title: string | null;
  description: string | null;
}

// Container segments that host law-and-regulation detail pages — drives the
// after-save redirect so the URL prefix (block-condo / property / etc.) is preserved.
const PARENT_SEGMENTS = ['block-condo', 'block-village', 'property-pma', 'property'] as const;

const CreateLawAndRegulationPage = () => {
  const { t } = useTranslation('appraisal');
  const { t: tCommon } = useTranslation('common');
  const isReadOnly = usePageReadOnly();

  const formFields = useMemo<FormField[]>(
    () => [
      {
        type: 'dropdown',
        label: t('lawsRegulations.editor.headerLabel'),
        name: 'headerCode',
        group: LAW_HEADER_GROUP,
        required: true,
      },
      {
        type: 'textarea',
        label: t('lawsRegulations.editor.remarkLabel'),
        name: 'remark',
        maxLength: 4000,
        showCharCount: true,
        className: 'min-h-[240px]',
      },
    ],
    [t],
  );
  const navigate = useNavigate();
  const basePath = useBasePath();
  const location = useLocation();
  const appraisalId = useAppraisalId();
  const currentUser = useAuthStore(state => state.user);
  const { itemId } = useParams<{ itemId?: string }>();
  const isEditMode = Boolean(itemId);

  const segments = location.pathname.replace(`${basePath}/`, '').split('/').filter(Boolean);
  const parentSegment =
    (PARENT_SEGMENTS as readonly string[]).find(s => s === segments[0]) ?? 'property';

  // RHF + Zod
  const lawAndRegulationFormSchema = useCreateLawAndRegulationFormSchema();
  const methods = useForm<CreateLawAndRegulationFormType>({
    defaultValues: createLawAndRegulationFormDefault,
    resolver: zodResolver(lawAndRegulationFormSchema),
  });

  const {
    formState: { isDirty: isFormDirty },
  } = methods;

  // Image & UI state. The images live outside the form, so they carry their own dirty flag —
  // without it, adding or taking off a picture never warned about leaving with unsaved work.
  const [images, setImages] = useState<LocalImage[]>([]);
  const [imagesDirty, setImagesDirty] = useState(false);
  const isDirty = isFormDirty || imagesDirty;
  const { blocker, skipWarning } = useUnsavedChangesWarning(isDirty);
  const [saveAction, setSaveAction] = useState<'draft' | 'submit' | null>(null);

  // Preview state
  const [previewPhoto, setPreviewPhoto] = useState<PreviewablePhoto | null>(null);

  // Modal state
  const [showGalleryModal, setShowGalleryModal] = useState(false);

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

  // Structural "Property Information → Law & Regulation" parents come from the URL
  // (handled in the layout). Only push the dynamic leaf (header label) here.
  const editingItem = isEditMode ? allItems.find(i => i.id === itemId) : null;
  const headerLabel = useParameterDescription('Header', editingItem?.headerCode);
  const lawLeafLabel = isEditMode ? headerLabel || '...' : null;
  useBreadcrumbExtras(
    lawLeafLabel ? [{ label: lawLeafLabel, href: location.pathname, icon: 'gavel' }] : [],
    [lawLeafLabel, location.pathname],
  );

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

  // What the images panel draws. A photo the gallery no longer has is flagged rather than shown
  // as a broken image — but only once the gallery has loaded, or every photo would look gone.
  const panelImages: LawPanelImage[] = useMemo(
    () =>
      images.map(img => {
        const galleryImg = galleryPhotoMap.get(img.galleryPhotoId);
        return {
          key: img.galleryPhotoId,
          src: galleryImg?.thumbnailSrc || galleryImg?.src || undefined,
          fileName: galleryImg?.fileName,
          caption: img.description ?? galleryImg?.caption ?? null,
          missing: !!galleryData && !galleryImg,
        };
      }),
    [images, galleryPhotoMap, galleryData],
  );

  // Map for preview modal
  const previewablePhotos: PreviewablePhoto[] = useMemo(
    () =>
      images
        .map(img => {
          const galleryImg = galleryPhotoMap.get(img.galleryPhotoId);
          return {
            id: img.galleryPhotoId,
            src: galleryImg?.src ?? '',
            fileName: galleryImg?.fileName,
            caption: img.description ?? galleryImg?.caption ?? null,
            fileExtension: galleryImg?.fileExtension,
            mimeType: galleryImg?.mimeType,
            fileSizeBytes: galleryImg?.fileSizeBytes,
          };
        })
        // A photo the gallery lost has nothing to show.
        .filter(photo => photo.src !== ''),
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
          uploadedBy: currentUser?.username ?? '',
          photoCategory: null,
          caption: null,
          latitude: null,
          longitude: null,
          capturedAt: null,
          photoTopicIds: null,
          fileName: uploadResult.fileName,
          filePath: uploadResult.storageUrl,
          fileExtension: file.name.includes('.') ? (file.name.split('.').pop() ?? null) : null,
          mimeType: file.type || null,
          fileSizeBytes: uploadResult.fileSize,
          uploadedByName: currentUser?.name ?? null,
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
        setImagesDirty(true);
        toast.success(t('toasts.lawImageUploaded', { name: file.name }));
      } catch {
        toast.error(t('toasts.lawImageUploadFailed'));
      }
    },
    [appraisalId, getOrCreateSession, uploadMutation, addGalleryPhoto, currentUser],
  );

  // The panel's upload button
  const handleUploadFiles = useCallback(
    (files: File[]) => {
      files.filter(file => file.type.startsWith('image/')).forEach(file => handleUpload(file));
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
      const files = Array.from(e.dataTransfer?.files ?? []).filter(f =>
        f.type.startsWith('image/'),
      );
      if (files.length > 0) {
        toast.success(t('toasts.lawImagesUploading', { count: files.length }));
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
    // Attach again once loading ends: while the spinner shows, the panel is not on the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

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
        setImagesDirty(true);
        toast.success(t('toasts.photoAddedCount', { count: selectedImages.length }));
      }
    },
    [t],
  );

  // Taking a picture off this item only unlinks it — it stays in the gallery, and nothing is
  // saved until the user saves — so it asks for no confirmation.
  const removeImage = useCallback((key: string) => {
    setImages(prev => prev.filter(img => img.galleryPhotoId !== key));
    setPreviewPhoto(prev => (prev?.id === key ? null : prev));
    setImagesDirty(true);
  }, []);

  const reorderImages = useCallback((activeKey: string, overKey: string) => {
    setImages(prev => {
      const from = prev.findIndex(img => img.galleryPhotoId === activeKey);
      const to = prev.findIndex(img => img.galleryPhotoId === overKey);
      return from < 0 || to < 0 ? prev : arrayMove(prev, from, to);
    });
    setImagesDirty(true);
  }, []);

  // The caption belongs to this law item (its image's Description), so one picture used under two
  // headers can say something different under each. Until the item has one of its own, the
  // gallery photo's caption shows instead — captions written before this editor lived there.
  // Cleared stays cleared: an empty string is kept rather than turned back into null, which would
  // bring the gallery caption back.
  const changeCaption = useCallback((key: string, caption: string) => {
    setImages(prev =>
      prev.map(img => (img.galleryPhotoId === key ? { ...img, description: caption } : img)),
    );
    setImagesDirty(true);
  }, []);

  const previewImage = useCallback(
    (key: string) => {
      const match = previewablePhotos.find(p => p.id === key);
      if (match) setPreviewPhoto(match);
    },
    [previewablePhotos],
  );

  // Build items array for batch save
  const buildItemsPayload = (
    formData: CreateLawAndRegulationFormType,
  ): LawAndRegulationItemInputType[] => {
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

  const navigateBack = () => navigate(`${basePath}/${parentSegment}?tab=laws`);

  const handleSave = (action: 'draft' | 'submit') => {
    if (!appraisalId) return;

    methods.handleSubmit(formData => {
      setSaveAction(action);
      const items = buildItemsPayload(formData);

      saveMutation.mutate(
        { appraisalId, items },
        {
          onSuccess: () => {
            toast.success(
              action === 'draft' ? t('toasts.draftSaved') : t('lawsRegulations.editor.saved'),
            );
            setSaveAction(null);
            skipWarning();
            navigateBack();
          },
          onError: () => {
            toast.error(t('toasts.lawSaveFailed'));
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
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          {/* The law on the left and its pictures beside it, so both are in view on a wide screen;
              narrow screens stack them. No page title: the breadcrumb already names the item. */}
          <div className="grid items-start gap-5 px-4 py-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,1fr)]">
            <div className="flex min-w-0 flex-col gap-6">
              <FormFields fields={formFields} disabled={isReadOnly} />
            </div>
            <LawImagesPanel
              images={panelImages}
              readOnly={isReadOnly}
              isDragging={isDragging}
              dropZoneRef={dropZoneRef}
              onReorder={reorderImages}
              onRemove={removeImage}
              onCaptionChange={changeCaption}
              onPreview={previewImage}
              onUpload={handleUploadFiles}
              onChooseFromGallery={() => setShowGalleryModal(true)}
            />
          </div>
        </div>

        {/* Sticky Action Buttons */}
        <ActionBar>
          <ActionBar.Left>
            <Button variant="ghost" type="button" onClick={navigateBack}>
              {tCommon('actions.cancel')}
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
                {t('createPage.saveDraft')}
              </Button>
              <Button
                type="button"
                onClick={() => handleSave('submit')}
                isLoading={isPending && saveAction === 'submit'}
                disabled={isPending}
              >
                <Icon name="check" style="solid" className="size-4 mr-2" />
                {t('createPage.save')}
              </Button>
            </ActionBar.Right>
          )}
        </ActionBar>

        {/* Gallery Selection Modal */}
        <GallerySelectionModal
          isOpen={showGalleryModal}
          onClose={() => setShowGalleryModal(false)}
          onSelect={handleGallerySelect}
          images={availableGalleryImages}
          multiSelect
        />

        <UnsavedChangesDialog blocker={blocker} />

        {/* Photo Preview Modal — its caption is this item's caption, the same one typed under the tile */}
        {previewPhoto && (
          <PhotoPreviewModal
            photo={previewPhoto}
            photos={previewablePhotos}
            onClose={() => setPreviewPhoto(null)}
            onNavigate={setPreviewPhoto}
            showInUseStatus={false}
            onDelete={isReadOnly ? undefined : () => removeImage(previewPhoto.id)}
            captionMaxLength={CAPTION_MAX}
            onSaveDescription={
              isReadOnly
                ? undefined
                : (caption: string) => {
                    changeCaption(previewPhoto.id, caption);
                    setPreviewPhoto(prev => (prev ? { ...prev, caption: caption || null } : null));
                  }
            }
          />
        )}
      </div>
    </FormProvider>
  );
};

export default CreateLawAndRegulationPage;
