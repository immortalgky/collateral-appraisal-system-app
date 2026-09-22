import { type Ref, useRef } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Icon from '@shared/components/Icon';

export interface LawPanelImage {
  /** The gallery photo's id — unique within one law item. */
  key: string;
  /** Thumbnail URL; absent while the gallery loads or when the photo is gone. */
  src?: string;
  fileName?: string;
  caption: string | null;
  /** The gallery photo was deleted, but this item still points at it. */
  missing: boolean;
}

interface LawImagesPanelProps {
  images: LawPanelImage[];
  readOnly: boolean;
  /** Files are being dragged over the panel. */
  isDragging: boolean;
  /** The page listens for dropped files on this element. */
  dropZoneRef: Ref<HTMLDivElement>;
  onReorder: (activeKey: string, overKey: string) => void;
  onRemove: (key: string) => void;
  onCaptionChange: (key: string, caption: string) => void;
  onPreview: (key: string) => void;
  onUpload: (files: File[]) => void;
  onChooseFromGallery: () => void;
}

/** The law image's `Description` column holds 500 characters. */
export const CAPTION_MAX = 500;

const SMALL_BUTTON =
  'inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50';

/**
 * The pictures of one law item, beside its text.
 *
 * Small numbered tiles in the order they are saved in, dragged to reorder, each with its caption
 * typed straight underneath. A photo the gallery no longer has is shown as such, with a way to
 * take it off, instead of as a broken image labelled "Photo 2".
 */
export const LawImagesPanel = ({
  images,
  readOnly,
  isDragging,
  dropZoneRef,
  onReorder,
  onRemove,
  onCaptionChange,
  onPreview,
  onUpload,
  onChooseFromGallery,
}: LawImagesPanelProps) => {
  const { t } = useTranslation('appraisal');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const missingCount = images.filter(image => image.missing).length;

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) onReorder(String(active.id), String(over.id));
  };

  const addButtons = readOnly ? null : (
    <div className="flex flex-wrap justify-center gap-1.5">
      <button type="button" onClick={() => fileInputRef.current?.click()} className={SMALL_BUTTON}>
        <Icon name="arrow-up-from-bracket" style="solid" className="size-3" />
        {t('lawsRegulations.editor.upload')}
      </button>
      <button type="button" onClick={onChooseFromGallery} className={SMALL_BUTTON}>
        <Icon name="images" style="solid" className="size-3" />
        {t('lawsRegulations.editor.fromGallery')}
      </button>
    </div>
  );

  return (
    <div
      ref={dropZoneRef}
      className="relative rounded-xl border border-gray-200 bg-gray-50 p-3 lg:sticky lg:top-4"
    >
      <div className="mb-2.5 flex items-baseline gap-2">
        <h3 className="text-sm font-semibold text-gray-900">
          {t('lawsRegulations.editor.images')}
        </h3>
        {images.length > 0 && (
          <span className="text-xs text-gray-400">
            {t('lawsRegulations.editor.photoCount', { n: images.length })}
            {missingCount > 0 && (
              <span className="text-red-600">
                {' · '}
                {t('lawsRegulations.editor.missingCount', { n: missingCount })}
              </span>
            )}
          </span>
        )}
        {images.length > 1 && !readOnly && (
          <span className="ml-auto text-[11px] text-gray-400">
            {t('lawsRegulations.editor.dragHint')}
          </span>
        )}
      </div>

      {images.length === 0 ? (
        <div className="rounded-lg border-[1.5px] border-dashed border-gray-300 bg-white px-4 py-7 text-center">
          <p className="text-sm font-medium text-gray-800">
            {t('lawsRegulations.editor.emptyTitle')}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            {readOnly
              ? t('lawsRegulations.editor.emptyReadOnly')
              : t('lawsRegulations.editor.emptyHint')}
          </p>
          {addButtons && <div className="mt-3">{addButtons}</div>}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={images.map(image => image.key)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-2.5">
              {images.map((image, index) => (
                <SortableShot
                  key={image.key}
                  image={image}
                  index={index}
                  readOnly={readOnly}
                  onRemove={onRemove}
                  onCaptionChange={onCaptionChange}
                  onPreview={onPreview}
                />
              ))}
              {addButtons && (
                <div className="col-span-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border-[1.5px] border-dashed border-gray-300 bg-white px-3 py-2.5">
                  <span className="text-xs text-gray-400">
                    {t('lawsRegulations.editor.dropHere')}
                  </span>
                  {addButtons}
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={e => {
          // Copy before clearing: resetting the input empties its FileList.
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (files.length > 0) onUpload(files);
        }}
      />

      {isDragging && !readOnly && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary-50/90 text-center">
          <div>
            <p className="text-sm font-semibold text-primary-700">
              {t('lawsRegulations.editor.dropTitle')}
            </p>
            <p className="text-xs text-gray-500">{t('lawsRegulations.editor.dropSub')}</p>
          </div>
        </div>
      )}
    </div>
  );
};

interface SortableShotProps {
  image: LawPanelImage;
  index: number;
  readOnly: boolean;
  onRemove: (key: string) => void;
  onCaptionChange: (key: string, caption: string) => void;
  onPreview: (key: string) => void;
}

/** One tile. It is dragged by its picture, so the caption underneath still selects text. */
const SortableShot = ({
  image,
  index,
  readOnly,
  onRemove,
  onCaptionChange,
  onPreview,
}: SortableShotProps) => {
  const { t } = useTranslation('appraisal');
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.key,
    disabled: readOnly,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={clsx(
        'group flex flex-col overflow-hidden rounded-lg border',
        image.missing ? 'border-dashed border-red-300 bg-red-50' : 'border-gray-200 bg-white',
        isDragging && 'relative z-10 opacity-60 shadow-lg',
      )}
    >
      {/* Clipped, with the picture pinned inside: `aspect-ratio` alone lets a tall image stretch
          the box to its own height, so every tile came out a different size. */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {image.missing ? (
          <div className="flex size-full flex-col items-center justify-center px-2 text-center text-red-600">
            <span className="text-xs font-semibold">
              {t('lawsRegulations.editor.missingTitle')}
            </span>
            <span className="text-[11px] opacity-80">
              {t('lawsRegulations.editor.missingHint')}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onPreview(image.key)}
            className="absolute inset-0 block cursor-zoom-in bg-gray-100"
            {...(readOnly ? {} : { ...attributes, ...listeners })}
          >
            {image.src && (
              <img
                src={image.src}
                alt={image.caption || image.fileName || ''}
                className="size-full object-cover"
                draggable={false}
              />
            )}
          </button>
        )}
        <span className="pointer-events-none absolute left-1.5 top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-gray-900/70 px-1.5 text-[11px] font-semibold tabular-nums text-white">
          {index + 1}
        </span>
        {!readOnly && !image.missing && (
          <button
            type="button"
            onClick={() => onRemove(image.key)}
            aria-label={t('lawsRegulations.editor.removeAria')}
            title={t('lawsRegulations.editor.removeAria')}
            className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-gray-900/70 text-white opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
          >
            <Icon name="xmark" style="solid" className="size-3" />
          </button>
        )}
      </div>
      {image.missing ? (
        <div className="flex items-center justify-between gap-2 border-t border-red-200 px-2 py-1.5 text-[11px] text-red-600">
          <span>{t('lawsRegulations.editor.missingNoImage')}</span>
          {!readOnly && (
            <button
              type="button"
              onClick={() => onRemove(image.key)}
              className="rounded border border-red-300 bg-white px-2 py-0.5 font-medium transition-colors hover:bg-red-50"
            >
              {t('lawsRegulations.editor.remove')}
            </button>
          )}
        </div>
      ) : (
        <input
          type="text"
          value={image.caption ?? ''}
          onChange={e => onCaptionChange(image.key, e.target.value)}
          readOnly={readOnly}
          maxLength={CAPTION_MAX}
          placeholder={
            readOnly
              ? t('lawsRegulations.editor.noCaption')
              : t('lawsRegulations.editor.captionPlaceholder')
          }
          aria-label={t('lawsRegulations.editor.captionLabel', { n: index + 1 })}
          className="w-full border-t border-gray-100 bg-transparent px-2 py-1.5 text-xs text-gray-700 placeholder:text-gray-400 focus:bg-primary-50/40 focus:outline-none"
        />
      )}
    </div>
  );
};
