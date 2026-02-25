import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import Section from '@shared/components/sections/Section';
import UploadArea from '@shared/components/inputs/UploadArea';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import { FormFields, type FormField } from '@/shared/components/form';
import { PhotoGridView } from '../components/gallery';
import PhotoPreviewModal, { type PreviewablePhoto } from '../components/PhotoPreviewModal';
import type { GalleryImage } from '../types/gallery';
import { useGetLawAndRegulations, useSaveLawAndRegulations } from '../api/lawAndRegulation';
import { createUploadSession, useUploadDocument } from '@features/request/api/documents';
import type {
  LawAndRegulationImageInputType,
  LawAndRegulationItemInputType,
} from '@shared/schemas/v1';
import {
  createLawAndRegulationForm,
  createLawAndRegulationFormDefault,
  type CreateLawAndRegulationFormType,
} from '../schemas/lawAndRegulation';

const LAW_HEADER_GROUP = 'Header';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getImageSrc = (documentId: string) =>
  `${API_BASE_URL}/documents/${documentId}/download?download=false`;

const getThumbnailSrc = (documentId: string) =>
  `${API_BASE_URL}/documents/${documentId}/download?download=false&size=large`;

interface LocalImage {
  id: string | null;
  documentId: string;
  displaySequence: number;
  fileName: string;
  filePath: string;
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
  const navigate = useNavigate();
  const { appraisalId, itemId } = useParams<{ appraisalId: string; itemId?: string }>();
  const isEditMode = Boolean(itemId);

  // RHF + Zod
  const methods = useForm<CreateLawAndRegulationFormType>({
    defaultValues: createLawAndRegulationFormDefault,
    resolver: zodResolver(createLawAndRegulationForm),
  });

  // Image & UI state
  const [images, setImages] = useState<LocalImage[]>([]);
  const [saveAction, setSaveAction] = useState<'draft' | 'submit' | null>(null);

  // Preview state
  const [previewPhoto, setPreviewPhoto] = useState<PreviewablePhoto | null>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{ documentId: string; fileName: string } | null>(null);

  // API
  const { data, isLoading } = useGetLawAndRegulations(appraisalId);
  const saveMutation = useSaveLawAndRegulations();
  const uploadMutation = useUploadDocument();

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
            documentId: img.documentId,
            displaySequence: img.displaySequence,
            fileName: img.fileName,
            filePath: img.filePath,
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
      images.map((img, idx) => ({
        id: img.documentId,
        documentId: img.documentId,
        photoNumber: idx + 1,
        src: getImageSrc(img.documentId),
        thumbnailSrc: getThumbnailSrc(img.documentId),
        alt: img.fileName,
        fileName: img.fileName,
        caption: img.title,
        description: img.description ?? undefined,
        photoType: 'LAW_REG',
        photoCategory: null,
        isUsedInReport: false,
        reportSection: null,
        latitude: null,
        longitude: null,
        capturedAt: null,
      })),
    [images],
  );

  // Map for preview modal
  const previewablePhotos: PreviewablePhoto[] = useMemo(
    () =>
      images.map(img => ({
        id: img.documentId,
        src: getImageSrc(img.documentId),
        fileName: img.fileName,
      })),
    [images],
  );

  // Upload handler
  const handleUpload = useCallback(
    async (file: File) => {
      try {
        const sessionId = await getOrCreateSession();
        const result = await uploadMutation.mutateAsync({
          uploadSessionId: sessionId,
          file,
          documentType: 'LAW_REG',
          documentCategory: 'support',
        });

        setImages(prev => [
          ...prev,
          {
            id: null,
            documentId: result.documentId,
            displaySequence: prev.length + 1,
            fileName: result.fileName,
            filePath: result.storageUrl,
            title: null,
            description: null,
          },
        ]);
        toast.success(`Uploaded "${file.name}"`);
      } catch {
        toast.error('Failed to upload image');
      }
    },
    [getOrCreateSession, uploadMutation],
  );

  // File input change handler
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
      if (imageFiles.length === 0) {
        toast.error('Only image files are supported');
        return;
      }
      imageFiles.forEach(file => handleUpload(file));
      e.target.value = '';
    },
    [handleUpload],
  );

  // Delete handler for PhotoGridView
  const handleImageDelete = useCallback((image: GalleryImage) => {
    setDeleteTarget({ documentId: image.documentId, fileName: image.fileName ?? image.alt });
  }, []);

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    setImages(prev => prev.filter(img => img.documentId !== deleteTarget.documentId));
    // Also close preview if the deleted image is being previewed
    setPreviewPhoto(prev => (prev?.id === deleteTarget.documentId ? null : prev));
    setDeleteTarget(null);
  }, [deleteTarget]);

  // Click handler for PhotoGridView (opens preview)
  const handleImageClick = useCallback((image: GalleryImage) => {
    setPreviewPhoto({ id: image.id, src: image.src, fileName: image.fileName });
  }, []);

  // Build items array for batch save
  const buildItemsPayload = (formData: CreateLawAndRegulationFormType): LawAndRegulationItemInputType[] => {
    const currentItem: LawAndRegulationItemInputType = {
      id: isEditMode && itemId ? itemId : null,
      headerCode: formData.headerCode,
      remark: formData.remark || null,
      images: images.map(
        (img, idx): LawAndRegulationImageInputType => ({
          id: img.id,
          documentId: img.documentId,
          displaySequence: idx + 1,
          fileName: img.fileName,
          filePath: img.filePath,
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
                documentId: img.documentId,
                displaySequence: img.displaySequence,
                fileName: img.fileName,
                filePath: img.filePath,
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
          documentId: img.documentId,
          displaySequence: img.displaySequence,
          fileName: img.fileName,
          filePath: img.filePath,
          title: img.title,
          description: img.description,
        })),
      })),
      currentItem,
    ];
  };

  const navigateBack = () => navigate(`/appraisal/${appraisalId}/property?tab=laws`);

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
              <div className="flex flex-col gap-4">
                <span className="block text-xs font-medium text-gray-700">Images</span>

                {/* Upload area */}
                <UploadArea
                  onChange={handleFileInputChange}
                  accept="image/*"
                  multiple
                  supportedText="PNG, JPG (Max 10MB each)"
                />

                {/* Photo grid */}
                {gridImages.length > 0 && (
                  <PhotoGridView
                    images={gridImages}
                    onImageClick={handleImageClick}
                    onImageDelete={handleImageDelete}
                    showUsedBadge={false}
                  />
                )}
              </div>
            </Section>
          </div>
        </div>

        {/* Sticky Action Buttons */}
        <div className="shrink-0 bg-white border-t border-gray-200 px-4 py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button variant="ghost" type="button" onClick={navigateBack}>
                Cancel
              </Button>
              <div className="h-6 w-px bg-gray-200" />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
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
            </div>
          </div>
        </div>

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

        {/* Photo Preview Modal */}
        {previewPhoto && (
          <PhotoPreviewModal
            photo={previewPhoto}
            photos={previewablePhotos}
            onClose={() => setPreviewPhoto(null)}
            onNavigate={setPreviewPhoto}
            onDelete={() => {
              setDeleteTarget({
                documentId: previewPhoto.id,
                fileName: previewPhoto.fileName ?? 'this image',
              });
            }}
          />
        )}
      </div>
    </FormProvider>
  );
};

export default CreateLawAndRegulationPage;
