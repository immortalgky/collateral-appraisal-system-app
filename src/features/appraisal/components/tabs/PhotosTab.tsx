import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Icon from '@shared/components/Icon';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import { SegmentedControl } from '@shared/components/SegmentedControl';
import { useUIStore } from '@shared/store';
import GallerySelectionModal from '../GallerySelectionModal';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import PhotoPreviewModal from '../PhotoPreviewModal';
import type { PreviewablePhoto } from '../PhotoPreviewModal';
import { PhotoGridView } from '../gallery';
import { GroupActionsMenu } from '../GroupActionsMenu';
import { useGroupRename } from '../../hooks/useGroupRename';
import type { GalleryImage, TopicPhotoDisplay } from '../../types/gallery';
import { toGalleryImage, toTopicPhotoDisplay } from '../../types/gallery';
import type { PhotoTopicDtoType, GalleryPhotoDtoType } from '@shared/schemas/v1';
import {
  fetchPhotoTopics,
  photoTopicKeys,
  useGetPhotoTopics,
  useCreatePhotoTopic,
  useUpdatePhotoTopic,
  useDeletePhotoTopic,
  useAssignPhotoToTopic,
} from '../../api/photo';
import { useGetGalleryPhotos, useAddGalleryPhoto, useUpdateGalleryPhoto } from '../../api/gallery';
import { createUploadSession, useUploadDocument } from '@features/request/api/documents';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useAuthStore } from '@features/auth/store';
import DataErrorState from '@/shared/components/DataErrorState';

/** Columns a topic's photos take in the report. */
const COLUMN_OPTIONS = [
  { value: '1', label: '1', icon: 'square' },
  { value: '2', label: '2', icon: 'table-columns' },
  { value: '3', label: '3', icon: 'table-cells' },
] as const;
type ColumnValue = (typeof COLUMN_OPTIONS)[number]['value'];
const clampColumns = (n: number): 1 | 2 | 3 => (n <= 1 ? 1 : n >= 3 ? 3 : 2);

/** A tiny picture of N columns, beside the count in each topic row. */
const ColumnsGlyph = ({ n }: { n: number }) => (
  <span className="inline-flex gap-px" aria-hidden>
    {Array.from({ length: n }, (_, i) => (
      <i key={i} className="h-2.5 w-1 rounded-[1px] bg-current opacity-60" />
    ))}
  </span>
);

/**
 * One topic in the rail: drag handle, name with its photo count and columns, and the ⋮ menu.
 * Renames in place with the same hook the property groups use.
 */
const TopicRow = ({
  topic,
  columns,
  isSelected,
  readOnly,
  onSelect,
  onRename,
  onDelete,
}: {
  topic: PhotoTopicDtoType;
  columns: number;
  isSelected: boolean;
  readOnly: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) => {
  const { t } = useTranslation('appraisal');
  const rename = useGroupRename(topic.id, topic.topicName, (_id, name) => onRename(name));
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: topic.id,
    disabled: readOnly,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={clsx(
        'flex items-center gap-1.5 border-l-[3px] py-2 pl-1.5 pr-1 transition-colors',
        isSelected ? 'border-primary bg-primary-50' : 'border-transparent hover:bg-gray-50',
        isDragging && 'opacity-50',
      )}
    >
      {!readOnly && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={t('photoTopics.dragHint')}
          className="cursor-grab px-0.5 text-gray-300 hover:text-gray-500 active:cursor-grabbing"
        >
          <Icon name="grip-vertical" style="solid" className="text-[10px]" />
        </button>
      )}
      {rename.isEditing ? (
        <input
          ref={rename.inputRef}
          value={rename.value}
          onChange={e => rename.setValue(e.target.value)}
          onBlur={rename.commit}
          onKeyDown={rename.onKeyDown}
          className="min-w-0 flex-1 rounded border border-primary bg-white px-1.5 py-0.5 text-[12.5px] outline-none focus:ring-1 focus:ring-primary"
        />
      ) : (
        <button
          type="button"
          onClick={onSelect}
          className="min-w-0 flex-1 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <span
            className={clsx(
              'block truncate text-[12.5px]',
              isSelected ? 'font-semibold text-primary-800' : 'text-gray-800',
            )}
          >
            {topic.topicName}
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <span className="tabular-nums">
              {t('photoTopics.photoCount', { n: topic.photoCount })}
            </span>
            <span>·</span>
            <ColumnsGlyph n={columns} />
            <span>{t('photoTopics.columnsShort', { n: columns })}</span>
          </span>
        </button>
      )}
      {!readOnly && !rename.isEditing && (
        <GroupActionsMenu
          onRename={rename.start}
          onDelete={onDelete}
          iconClassName="text-[10px]"
          labels={{ rename: t('photoTopics.rename'), delete: t('photoTopics.delete') }}
        />
      )}
    </div>
  );
};

/**
 * A thumbnail of how a report page lays photos out at this column count. It is an illustration,
 * not a tally: a fixed sample whatever the topic holds, so a long topic does not run the little
 * page off the bottom of the panel. One row at a single column — a full-width photo is tall
 * enough that two would not fit the page — and two rows otherwise.
 */
const sampleRows = (columns: number) => (columns === 1 ? 1 : 2);

const ReportPagePreview = ({ columns, onClose }: { columns: number; onClose: () => void }) => {
  const { t } = useTranslation('appraisal');
  return (
    <div className="relative w-32 shrink-0">
      <button
        type="button"
        onClick={onClose}
        aria-label={t('photoTopics.previewHide')}
        title={t('photoTopics.previewHide')}
        className="absolute -right-1.5 -top-1.5 z-10 flex size-5 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition-colors hover:text-gray-700"
      >
        <Icon name="xmark" style="solid" className="text-[9px]" />
      </button>
      <div className="flex aspect-[1/1.414] flex-col gap-1 overflow-hidden rounded-md border border-gray-200 bg-white p-2 shadow-sm">
        <span className="h-1 w-3/5 shrink-0 rounded bg-gray-200" />
        <span className="mb-1 h-1 w-2/5 shrink-0 rounded bg-gray-100" />
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns * sampleRows(columns) }, (_, i) => (
            <span key={i} className="aspect-[4/3] rounded-[2px] bg-primary/30" />
          ))}
        </div>
      </div>
      <p className="mt-1.5 text-center text-[10.5px] text-gray-400">
        {t('photoTopics.pagePreview', { n: columns })}
      </p>
    </div>
  );
};

/**
 * Topic writes, one queue per appraisal. The API replaces a topic whole — name, position and
 * columns together — so two writes in flight at once each carried the other's field as it was
 * before: a column change could undo a drag, a drag could undo a rename. Kept outside the
 * component so that switching tabs and coming back joins the same queue instead of starting a
 * second one that races the first.
 */
const topicWriteQueues = new Map<string, { tail: Promise<void>; pending: number }>();

interface TopicWrite {
  topicId: string;
  topicName: string;
  sortOrder: number;
  displayColumns: number;
}

/**
 * The report's photo topics: a rail of topics on the left, the selected topic's photos on the
 * right. The photos keep an ordinary grid whatever the column setting — rearranging them on every
 * click made the list jump around — and the setting shows in the report-page preview beside them.
 */
export const PhotosTab = () => {
  const readOnly = usePageReadOnly();
  const { t } = useTranslation('appraisal');
  const appraisalId = useAppraisalId();
  const currentUser = useAuthStore(state => state.user);

  // API hooks for topics
  const {
    data: topicsData,
    isLoading: isLoadingTopics,
    isError: isTopicsError,
    error: topicsError,
    refetch: refetchTopics,
  } = useGetPhotoTopics(appraisalId);
  const { mutate: createTopic } = useCreatePhotoTopic();
  const { mutateAsync: updateTopicAsync } = useUpdatePhotoTopic();
  const queryClient = useQueryClient();
  const { mutate: deleteTopic, isPending: isDeletingTopic } = useDeletePhotoTopic();
  const { mutateAsync: assignPhotoToTopic, isPending: isAssigningPhoto } = useAssignPhotoToTopic();

  // API hooks for gallery (upload flow)
  const {
    data: galleryData,
    isError: isGalleryError,
    error: galleryError,
    refetch: refetchGallery,
  } = useGetGalleryPhotos(appraisalId);
  const { mutateAsync: addGalleryPhoto } = useAddGalleryPhoto();
  const { mutateAsync: uploadDocument } = useUploadDocument();
  const { mutateAsync: updateGalleryPhotoApi, isPending: isUpdatingDescription } =
    useUpdateGalleryPhoto();

  // Build a lookup from documentId → GalleryPhotoDtoType for description editing
  const galleryPhotoByDocId = useMemo(() => {
    const map = new Map<string, GalleryPhotoDtoType>();
    if (galleryData?.photos) {
      for (const p of galleryData.photos as GalleryPhotoDtoType[]) {
        map.set(p.documentId, p);
      }
    }
    return map;
  }, [galleryData]);

  /**
   * Topics in report order. A drag reorders them here at once and holds that order until every
   * queued topic write has landed and the topics have been re-read (see `queueTopicWrite`).
   */
  const [orderOverride, setOrderOverride] = useState<string[] | null>(null);
  const topics = useMemo(() => {
    const list = [...(topicsData?.topics ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
    if (!orderOverride) return list;
    // A topic added while the dragged order is held is not in it; keep it, after the rest.
    const held = orderOverride
      .map(id => list.find(x => x.id === id))
      .filter((x): x is PhotoTopicDtoType => !!x);
    return [...held, ...list.filter(x => !orderOverride.includes(x.id))];
  }, [topicsData, orderOverride]);

  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [localLayouts, setLocalLayouts] = useState<Record<string, number>>({});
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  /** Which photos the gallery picker offers: all of them, or only those in no topic yet. */
  const [galleryModalScope, setGalleryModalScope] = useState<'all' | 'unplaced'>('all');
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<
    (PreviewablePhoto & { documentId?: string }) | null
  >(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'topic' | 'photo';
    id: string;
    name: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const newTopicInputRef = useRef<HTMLInputElement>(null);
  const uploadSessionIdRef = useRef<string | null>(null);
  const sessionPromiseRef = useRef<Promise<string> | null>(null);

  useEffect(() => {
    if (isAddingTopic) newTopicInputRef.current?.focus();
  }, [isAddingTopic]);

  // Select first topic when topics load
  useEffect(() => {
    if (topics.length > 0 && !selectedTopicId) {
      setSelectedTopicId(topics[0].id);
    }
  }, [topics, selectedTopicId]);

  const selectedTopicRaw = topics.find(t => t.id === selectedTopicId);
  // Merge local layout state with topic data
  const selectedTopic = selectedTopicRaw
    ? {
        ...selectedTopicRaw,
        displayColumns: localLayouts[selectedTopicRaw.id] ?? selectedTopicRaw.displayColumns,
      }
    : undefined;

  // Photos come from the selected topic's embedded photos array
  const topicPhotos: TopicPhotoDisplay[] = useMemo(
    () => (selectedTopic?.photos ?? []).map(toTopicPhotoDisplay),
    [selectedTopic?.photos],
  );

  // Get gallery images for "Choose from Gallery" modal
  const galleryImages: GalleryImage[] = useMemo(
    () => (galleryData?.photos ?? []).map(toGalleryImage),
    [galleryData],
  );

  /** Photos not in any topic yet — the ones still to be placed in the report. */
  const unplacedImages: GalleryImage[] = useMemo(() => {
    const unplacedIds = new Set(
      (galleryData?.photos ?? []).filter(p => (p.photoTopicIds ?? []).length === 0).map(p => p.id),
    );
    return galleryImages.filter(img => unplacedIds.has(img.id));
  }, [galleryData, galleryImages]);

  // Map topic photos → GalleryImage[] for PhotoGridView
  const gridImages: GalleryImage[] = useMemo(
    () =>
      topicPhotos.map((photo, idx) => {
        const dto = galleryPhotoByDocId.get(photo.documentId);
        return {
          id: photo.id,
          documentId: photo.documentId,
          photoNumber: photo.photoNumber ?? idx + 1,
          src: photo.src,
          thumbnailSrc: photo.thumbnailSrc,
          alt: photo.caption || photo.fileName,
          fileName: dto?.fileName ?? `Photo #${photo.photoNumber ?? idx + 1}`,
          caption: photo.caption ?? dto?.caption ?? null,
          description: photo.caption ?? dto?.caption ?? undefined,
          photoType: dto?.photoType ?? 'general',
          photoCategory: dto?.photoCategory ?? null,
          isInUse: dto?.isInUse ?? false,
          latitude: dto?.latitude ?? null,
          longitude: dto?.longitude ?? null,
          capturedAt: dto?.capturedAt ?? null,
          fileExtension: dto?.fileExtension,
          mimeType: dto?.mimeType,
          fileSizeBytes: dto?.fileSizeBytes,
        };
      }),
    [topicPhotos, galleryPhotoByDocId],
  );

  const totalPhotos = topics.reduce((sum, t) => sum + t.photoCount, 0);

  /**
   * Get or create an upload session for photo uploads.
   */
  const getOrCreateSession = useCallback(async (): Promise<string> => {
    if (uploadSessionIdRef.current) {
      return uploadSessionIdRef.current;
    }

    if (sessionPromiseRef.current) {
      return sessionPromiseRef.current;
    }

    sessionPromiseRef.current = createUploadSession()
      .then(response => {
        uploadSessionIdRef.current = response.sessionId;
        return response.sessionId;
      })
      .catch(error => {
        sessionPromiseRef.current = null;
        throw error;
      });

    return sessionPromiseRef.current;
  }, []);

  const handleAddTopic = () => {
    if (newTopicName.trim() && appraisalId) {
      createTopic({
        appraisalId,
        topicName: newTopicName.trim(),
        sortOrder: topics.length + 1,
        displayColumns: 2,
      });
      setNewTopicName('');
      setIsAddingTopic(false);
      toast.success(t('toasts.topicCreated'));
    }
  };

  /**
   * Queue a write to the topics (see `topicWriteQueues`). Each write is built when its turn comes,
   * from the topics read straight from the API — not from the cache, whose refresh any other
   * refresh of the same list (an upload, a caption, a topic added or removed) can cut short,
   * leaving it as it was. The dragged order stays on screen until the queue is empty and the list
   * on screen has been replaced with what the server now has.
   */
  const queueTopicWrite = (
    build: (current: PhotoTopicDtoType[]) => TopicWrite[],
    failedMessage: string,
    onFailed?: () => void,
  ) => {
    if (!appraisalId) return;
    const key = photoTopicKeys.all(appraisalId);
    const queue = topicWriteQueues.get(appraisalId) ?? { tail: Promise.resolve(), pending: 0 };
    topicWriteQueues.set(appraisalId, queue);
    queue.pending += 1;
    queue.tail = queue.tail.then(async () => {
      try {
        const current = (await fetchPhotoTopics(appraisalId)).topics ?? [];
        const results = await Promise.allSettled(
          build(current).map(write => updateTopicAsync({ appraisalId, ...write })),
        );
        // A topic deleted after this write read the list answers 404. It is gone, not unsaved —
        // no reason to tell the user the order failed.
        const failed = results.some(
          r =>
            r.status === 'rejected' &&
            (r.reason as { response?: { status?: number } })?.response?.status !== 404,
        );
        if (failed) {
          onFailed?.();
          toast.error(failedMessage);
        }
      } catch {
        onFailed?.();
        toast.error(failedMessage);
      } finally {
        queue.pending -= 1;
        if (queue.pending === 0) {
          // Through the cache's own refresh, never a write of a separate read: that read could be
          // older than a refresh that lands meanwhile (a topic added, a photo uploaded) and would
          // put the old list back for the whole staleTime.
          await queryClient.invalidateQueries({ queryKey: key });
          // Checked again: a write queued while that refresh was in flight still holds its order.
          if (queue.pending === 0) setOrderOverride(null);
        }
      }
    });
  };

  const handleEditTopic = (topicId: string, name: string) => {
    queueTopicWrite(current => {
      const topic = current.find(x => x.id === topicId);
      return topic
        ? [
            {
              topicId,
              topicName: name,
              sortOrder: topic.sortOrder,
              displayColumns: topic.displayColumns,
            },
          ]
        : [];
    }, t('toasts.topicUpdateFailed'));
  };

  const handleDeleteTopic = async () => {
    if (deleteConfirm?.type === 'topic' && appraisalId) {
      const topic = topics.find(t => t.id === deleteConfirm.id);
      // Unassign all photos from the topic first
      if (topic?.photos.length) {
        try {
          await Promise.all(
            topic.photos.map(photo =>
              assignPhotoToTopic({
                appraisalId,
                photoId: photo.id,
                photoTopicIds: [],
              }),
            ),
          );
        } catch {
          toast.error(t('toasts.topicUnassignFailed'));
          setDeleteConfirm(null);
          return;
        }
      }
      deleteTopic({ appraisalId, topicId: deleteConfirm.id });
      if (selectedTopicId === deleteConfirm.id) {
        const remaining = topics.filter(t => t.id !== deleteConfirm.id);
        setSelectedTopicId(remaining[0]?.id || '');
      }
      setDeleteConfirm(null);
    }
  };

  const handleLayoutChange = (layout: number) => {
    if (!selectedTopicId || !appraisalId || !selectedTopicRaw) return;
    const topicId = selectedTopicId;
    // Shown at once; saved in turn. If the save fails, drop the local value so the page shows
    // the columns the server really has.
    setLocalLayouts(prev => ({ ...prev, [topicId]: layout }));
    queueTopicWrite(
      current => {
        const topic = current.find(x => x.id === topicId);
        return topic
          ? [
              {
                topicId,
                topicName: topic.topicName,
                sortOrder: topic.sortOrder,
                displayColumns: layout,
              },
            ]
          : [];
      },
      t('toasts.topicUpdateFailed'),
      // Only if it is still this value: a later click may already have replaced it.
      () =>
        setLocalLayouts(prev => {
          if (prev[topicId] !== layout) return prev;
          const next = { ...prev };
          delete next[topicId];
          return next;
        }),
    );
  };

  // Whether the report-page preview is shown beside the photos — remembered per browser.
  const previewOpen = useUIStore(state => state.photoTopicsPreviewOpen);
  const setPreviewOpen = useUIStore(state => state.setPhotoTopicsPreviewOpen);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  /** Reorder topics: every topic whose position changed gets its new sortOrder saved. */
  const handleTopicDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !appraisalId) return;
    const from = topics.findIndex(x => x.id === active.id);
    const to = topics.findIndex(x => x.id === over.id);
    if (from < 0 || to < 0) return;
    const ids = arrayMove(topics, from, to).map(x => x.id);
    setOrderOverride(ids);
    // Only topics whose position differs from the list as re-read are sent, with their name and
    // columns from that same list — a drag made while earlier writes are still landing no longer
    // compares against positions the server has not caught up with.
    queueTopicWrite(
      current =>
        ids.flatMap((id, index) => {
          const topic = current.find(x => x.id === id);
          return !topic || topic.sortOrder === index + 1
            ? []
            : [
                {
                  topicId: id,
                  topicName: topic.topicName,
                  sortOrder: index + 1,
                  displayColumns: topic.displayColumns,
                },
              ];
        }),
      t('toasts.topicReorderFailed'),
    );
  };

  const handleFileSelect = useCallback(
    async (files: FileList) => {
      if (!selectedTopicId || !appraisalId) {
        toast.error(t('toasts.photoSelectTopicFirst'));
        return;
      }

      const imageFiles = Array.from(files).filter(file => /\.(jpg|jpeg|png)$/i.test(file.name));
      if (imageFiles.length === 0) {
        toast.error(t('toasts.photoUnsupportedFormat'));
        return;
      }

      toast.success(t('toasts.uploading', { count: imageFiles.length }));

      try {
        const sessionId = await getOrCreateSession();

        for (const file of imageFiles) {
          try {
            // Step 1: Upload the document
            const uploadResult = await uploadDocument({
              uploadSessionId: sessionId,
              file,
              documentType: 'GAL_PHOTO',
              documentCategory: 'gallery',
            });

            // Step 2: Register in gallery with topic assignment
            await addGalleryPhoto({
              appraisalId,
              documentId: uploadResult.documentId,
              photoType: 'general',
              uploadedBy: currentUser?.username ?? '',
              uploadedByName: currentUser?.name ?? null,
              photoCategory: null,
              caption: null,
              latitude: null,
              longitude: null,
              capturedAt: null,
              photoTopicIds: [selectedTopicId],
              fileName: uploadResult.fileName,
              filePath: uploadResult.storageUrl,
              fileExtension: file.name.includes('.') ? (file.name.split('.').pop() ?? null) : null,
              mimeType: file.type || null,
              fileSizeBytes: uploadResult.fileSize,
            });

            toast.success(t('toasts.uploadedFile', { name: file.name }));
          } catch {
            toast.error(t('toasts.uploadFileFailed', { name: file.name }));
          }
        }
      } catch {
        toast.error(t('toasts.uploadSessionFailed'));
      }
    },
    [
      selectedTopicId,
      appraisalId,
      getOrCreateSession,
      uploadDocument,
      addGalleryPhoto,
      currentUser,
    ],
  );

  const handleGallerySelect = async (selectedImages: GalleryImage[]) => {
    if (!selectedTopicId || !appraisalId) return;

    let successCount = 0;
    for (const image of selectedImages) {
      try {
        await assignPhotoToTopic({
          appraisalId,
          photoId: image.id,
          photoTopicIds: [selectedTopicId],
        });
        successCount++;
      } catch {
        toast.error(t('toasts.photoAssignFailed'));
      }
    }

    if (successCount > 0) {
      toast.success(t('toasts.photoAddedCount', { count: successCount }));
    }
  };

  const handleRemovePhoto = async () => {
    if (deleteConfirm?.type === 'photo' && appraisalId) {
      try {
        await assignPhotoToTopic({
          appraisalId,
          photoId: deleteConfirm.id,
          photoTopicIds: [],
        });
      } catch {
        toast.error(t('toasts.photoRemoveFromTopicFailed'));
      }
      setDeleteConfirm(null);
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!readOnly) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (!readOnly) setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (readOnly) return;
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const openGalleryPicker = (scope: 'all' | 'unplaced') => {
    setGalleryModalScope(scope);
    setShowGalleryModal(true);
  };

  if (isLoadingTopics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <Icon name="images" className="text-xl text-primary" />
          </div>
          <p className="text-sm text-gray-500">{t('photoTopics.loading')}</p>
        </div>
      </div>
    );
  }

  if (isTopicsError && isGalleryError) {
    return (
      <DataErrorState
        variant="inline"
        title={t('photoTopics.loadError')}
        message={(topicsError as Error)?.message}
        onRetry={() => {
          void refetchTopics();
          void refetchGallery();
        }}
      />
    );
  }

  const columns = clampColumns(selectedTopic?.displayColumns ?? 2);

  return (
    // Exactly the tab area's height, so the page itself never scrolls: the rail scrolls its
    // topics and the right-hand panel scrolls its photos, each inside its own box.
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-gray-900">{t('photoTopics.title')}</h3>
        <p className="text-xs text-gray-500">
          {t('photoTopics.summary', { topics: topics.length, photos: totalPhotos })}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        {/* Left: the topics, in report order */}
        <div className="flex w-52 shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
          {!readOnly && topics.length > 1 && (
            <div className="border-b border-gray-100 px-3 py-1.5 text-[11px] text-gray-400">
              {t('photoTopics.dragHint')}
            </div>
          )}
          <div className="flex-1 overflow-y-auto">
            {isTopicsError && !isGalleryError && (
              <DataErrorState
                variant="inline"
                title={t('photoTopics.loadTopicsError')}
                message={(topicsError as Error)?.message}
                onRetry={refetchTopics}
              />
            )}
            <DndContext
              sensors={readOnly ? [] : sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleTopicDragEnd}
            >
              <SortableContext items={topics.map(x => x.id)} strategy={verticalListSortingStrategy}>
                <div className="divide-y divide-gray-100">
                  {topics.map(topic => (
                    <TopicRow
                      key={topic.id}
                      topic={topic}
                      columns={clampColumns(localLayouts[topic.id] ?? topic.displayColumns)}
                      isSelected={topic.id === selectedTopicId}
                      readOnly={readOnly}
                      onSelect={() => setSelectedTopicId(topic.id)}
                      onRename={name => handleEditTopic(topic.id, name)}
                      onDelete={() =>
                        setDeleteConfirm({ type: 'topic', id: topic.id, name: topic.topicName })
                      }
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {topics.length === 0 && !isAddingTopic && (
              <div className="px-4 py-10 text-center">
                <Icon name="folder-open" className="mb-2 text-2xl text-gray-300" />
                <p className="text-sm font-medium text-gray-600">{t('photoTopics.empty.title')}</p>
                <p className="mt-1 text-xs text-gray-400">{t('photoTopics.empty.hint')}</p>
              </div>
            )}
          </div>

          {!readOnly && selectedTopicId && unplacedImages.length > 0 && (
            <button
              type="button"
              onClick={() => openGalleryPicker('unplaced')}
              className="mx-2 mb-2 rounded-lg bg-amber-50 px-2.5 py-2 text-left text-[11.5px] text-amber-800 transition-colors hover:bg-amber-100"
            >
              {t('photoTopics.unplaced', { n: unplacedImages.length })} ·{' '}
              <span className="font-semibold">{t('photoTopics.unplacedAction')} ›</span>
            </button>
          )}

          {!readOnly &&
            (isAddingTopic ? (
              <div className="border-t border-gray-200 p-2">
                <input
                  ref={newTopicInputRef}
                  type="text"
                  value={newTopicName}
                  onChange={e => setNewTopicName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddTopic();
                    if (e.key === 'Escape') {
                      setIsAddingTopic(false);
                      setNewTopicName('');
                    }
                  }}
                  placeholder={t('photoTopics.namePlaceholder')}
                  className="mb-2 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAddTopic}
                    className="flex-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-700"
                  >
                    {t('photoTopics.save')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingTopic(false);
                      setNewTopicName('');
                    }}
                    className="rounded-lg px-3 py-1.5 text-xs text-gray-600 transition-colors hover:bg-gray-100"
                  >
                    {t('photoTopics.cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingTopic(true)}
                className="flex items-center gap-1.5 border-t border-gray-200 px-3 py-2 text-left text-xs font-medium text-primary-700 transition-colors hover:bg-gray-50"
              >
                <Icon name="plus" className="text-[10px]" />
                {t('photoTopics.add')}
              </button>
            ))}
        </div>

        {/* Right: the selected topic, as the report will lay it out */}
        <div
          className="flex min-w-0 flex-1 flex-col overflow-hidden"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {selectedTopic && (
            <div className="mb-3 flex shrink-0 flex-wrap items-center gap-3 border-b border-gray-100 pb-3">
              <div className="min-w-0">
                <h4 className="truncate text-sm font-semibold text-gray-900">
                  {selectedTopic.topicName}
                </h4>
                <p className="text-xs text-gray-400">
                  {t('photoTopics.photoCount', { n: topicPhotos.length })}
                </p>
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-500">{t('photoTopics.columnsLabel')}</span>
                <SegmentedControl
                  options={COLUMN_OPTIONS}
                  value={String(columns) as ColumnValue}
                  onChange={value => handleLayoutChange(Number(value))}
                />
                <button
                  type="button"
                  aria-pressed={previewOpen}
                  onClick={() => setPreviewOpen(!previewOpen)}
                  title={previewOpen ? t('photoTopics.previewHide') : t('photoTopics.previewShow')}
                  className={clsx(
                    'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
                    previewOpen
                      ? 'border-primary/40 bg-primary-50 text-primary-700'
                      : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50',
                  )}
                >
                  <Icon name="file-lines" className="text-[11px]" />
                  {t('photoTopics.preview')}
                </button>
                {!readOnly && (
                  <>
                    <button
                      type="button"
                      onClick={() => openGalleryPicker('all')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-white px-3 py-1.5 text-xs font-semibold text-primary-700 transition-colors hover:bg-primary-50"
                    >
                      <Icon name="images" className="text-[11px]" />
                      {t('photoTopics.fromGallery')}
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-700"
                    >
                      <Icon name="cloud-arrow-up" className="text-[11px]" />
                      {t('photoTopics.upload')}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-hidden">
            {isGalleryError && !isTopicsError ? (
              <DataErrorState
                variant="inline"
                title={t('photoTopics.loadGalleryError')}
                message={(galleryError as Error)?.message}
                onRetry={refetchGallery}
              />
            ) : !selectedTopic ? (
              <div className="flex h-full flex-col items-center justify-center py-16">
                <Icon name="hand-pointer" className="mb-3 text-3xl text-gray-300" />
                <p className="text-sm font-medium text-gray-500">
                  {t('photoTopics.selectTopic.title')}
                </p>
                <p className="mt-1 text-xs text-gray-400">{t('photoTopics.selectTopic.hint')}</p>
              </div>
            ) : isDragging ? (
              <div className="m-1 flex h-full min-h-[320px] items-center justify-center rounded-2xl border-2 border-dashed border-primary bg-primary-50/60">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex size-16 animate-bounce items-center justify-center rounded-2xl bg-primary-100">
                    <Icon name="cloud-arrow-down" className="text-2xl text-primary" />
                  </div>
                  <p className="text-lg font-semibold text-primary-700">
                    {t('photoTopics.drop.title')}
                  </p>
                  <p className="mt-1 text-sm text-primary/80">
                    {t('photoTopics.drop.hint', { topic: selectedTopic.topicName })}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex h-full gap-4">
                <div className="min-w-0 flex-1 overflow-y-auto pr-1">
                  {gridImages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-14 text-center">
                      <Icon name="images" className="mb-2 text-2xl text-gray-300" />
                      <p className="text-sm text-gray-500">{t('photoTopics.topicEmpty')}</p>
                    </div>
                  ) : (
                    <PhotoGridView
                      images={gridImages}
                      layout="dense"
                      onImageClick={image => setPreviewPhoto(image)}
                      onImageDelete={
                        readOnly
                          ? undefined
                          : image =>
                              setDeleteConfirm({
                                type: 'photo',
                                id: image.id,
                                name: image.caption || image.fileName || image.alt,
                              })
                      }
                      showUsedBadge={false}
                    />
                  )}
                </div>
                {previewOpen && (
                  <ReportPagePreview columns={columns} onClose={() => setPreviewOpen(false)} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png"
        multiple
        onClick={e => {
          (e.target as HTMLInputElement).value = '';
        }}
        onChange={e => e.target.files && handleFileSelect(e.target.files)}
        className="hidden"
      />

      {/* Gallery Selection Modal */}
      <GallerySelectionModal
        isOpen={showGalleryModal}
        onClose={() => setShowGalleryModal(false)}
        onSelect={handleGallerySelect}
        images={galleryModalScope === 'unplaced' ? unplacedImages : galleryImages}
        multiSelect
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={deleteConfirm?.type === 'topic' ? handleDeleteTopic : handleRemovePhoto}
        title={
          deleteConfirm?.type === 'topic'
            ? t('photoTopics.deleteTopic.title')
            : t('photoTopics.removePhoto.title')
        }
        message={
          deleteConfirm?.type === 'topic'
            ? t('photoTopics.deleteTopic.message', { name: deleteConfirm?.name ?? '' })
            : t('photoTopics.removePhoto.message', { name: deleteConfirm?.name ?? '' })
        }
        confirmText={
          deleteConfirm?.type === 'topic'
            ? t('photoTopics.confirmDelete')
            : t('photoTopics.confirmRemove')
        }
        variant="danger"
        isLoading={isDeletingTopic || isAssigningPhoto}
      />

      {/* Photo Preview Modal - Enhanced with navigation */}
      {previewPhoto && (
        <PhotoPreviewModal
          photo={previewPhoto}
          photos={gridImages}
          onClose={() => setPreviewPhoto(null)}
          onNavigate={setPreviewPhoto}
          showInUseStatus={false}
          onDelete={
            readOnly
              ? undefined
              : () => {
                  setDeleteConfirm({
                    type: 'photo',
                    id: previewPhoto.id,
                    name: previewPhoto.caption || previewPhoto.fileName || 'Photo',
                  });
                  setPreviewPhoto(null);
                }
          }
          onSaveDescription={
            readOnly
              ? undefined
              : async (caption: string) => {
                  if (!appraisalId || !previewPhoto.documentId) return;
                  try {
                    const dto = galleryPhotoByDocId.get(previewPhoto.documentId);
                    if (!dto) {
                      toast.error(t('toasts.galleryPhotoNotFound'));
                      return;
                    }
                    await updateGalleryPhotoApi({
                      appraisalId,
                      photoId: dto.id,
                      caption: caption || null,
                      photoCategory: dto.photoCategory ?? null,
                      latitude: dto.latitude ?? null,
                      longitude: dto.longitude ?? null,
                      capturedAt: dto.capturedAt ?? null,
                    });
                    setPreviewPhoto(prev => (prev ? { ...prev, caption: caption || null } : null));
                    toast.success(t('toasts.descriptionUpdated'));
                  } catch {
                    toast.error(t('toasts.descriptionUpdateFailed'));
                  }
                }
          }
          isSavingDescription={isUpdatingDescription}
        />
      )}
    </div>
  );
};

export default PhotosTab;
