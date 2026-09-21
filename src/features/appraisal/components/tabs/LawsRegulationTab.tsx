import { type KeyboardEvent, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import clsx from 'clsx';
import { useBasePath, useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import Icon from '@shared/components/Icon';
import { useParameterDescription } from '@shared/utils/parameterUtils';
import { useGetLawAndRegulations, useSaveLawAndRegulations } from '@features/appraisal/api';
import { useGetGalleryPhotos } from '../../api/gallery';
import { toGalleryImage } from '../../types/gallery';
import { DeleteConfirmationModal } from '../DeleteConfirmationModal';
import type { LawAndRegulationDtoType } from '@shared/schemas/v1';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import DataErrorState from '@/shared/components/DataErrorState';

/**
 * The parameter group the create/edit form picks headers from. The tab used to resolve labels
 * against 'LAW_HEADER', a group that does not exist, so every row showed a bare code.
 */
const LAW_HEADER_GROUP = 'Header';

/** Thumbnails shown per item before the rest fold into "+N". */
const MAX_THUMBS = 3;

interface ItemCardProps {
  item: LawAndRegulationDtoType;
  thumbnails: string[];
  readOnly: boolean;
  onOpen: () => void;
  onDelete: () => void;
}

/**
 * One law or regulation: the header, the remark, and the pictures that back it up.
 *
 * The old row showed a header and one line of remark; the images were only visible after opening
 * the item. They are the evidence — a zoning map, a highway boundary — so they come out here.
 */
const ItemCard = ({ item, thumbnails, readOnly, onOpen, onDelete }: ItemCardProps) => {
  const { t } = useTranslation('appraisal');
  const label = useParameterDescription(LAW_HEADER_GROUP, item.headerCode);
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen();
    }
  };
  const shown = thumbnails.slice(0, MAX_THUMBS);
  const more = thumbnails.length - shown.length;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      className="grid cursor-pointer grid-cols-[2.25rem_minmax(0,1fr)_auto_1.75rem] items-center gap-3 rounded-xl border border-gray-200 bg-white px-3.5 py-3 transition-colors hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none"
    >
      <span className="flex size-9 items-center justify-center rounded-lg bg-amber-600/10 text-amber-700">
        <Icon name="gavel" style="solid" className="text-sm" />
      </span>

      <div className="min-w-0">
        <h4 className="flex items-baseline gap-2 text-[13.5px] font-semibold text-gray-900">
          <span className="truncate">{label || item.headerCode}</span>
          {/* The code only adds something when the master has a real name to show beside it. */}
          {label && label !== item.headerCode && (
            <span className="shrink-0 text-[10.5px] font-medium tabular-nums text-gray-400">
              {item.headerCode}
            </span>
          )}
        </h4>
        {item.remark && (
          <p className="mt-0.5 line-clamp-2 text-[12.5px] text-gray-600">{item.remark}</p>
        )}
      </div>

      {shown.length > 0 ? (
        <div className="flex items-center gap-1.5">
          {shown.map(src => (
            <img
              key={src}
              src={src}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-10 w-14 rounded-md bg-gray-100 object-cover"
            />
          ))}
          {more > 0 && (
            <span className="flex size-10 items-center justify-center rounded-md bg-gray-100 text-[11px] font-semibold tabular-nums text-gray-600">
              +{more}
            </span>
          )}
        </div>
      ) : (
        <span className="self-center text-[11px] italic text-gray-400">
          {t('lawsRegulations.noImages')}
        </span>
      )}

      {readOnly ? (
        <span aria-hidden />
      ) : (
        <Menu as="div" className="relative">
          <MenuButton
            onClick={e => e.stopPropagation()}
            onKeyDown={e => e.stopPropagation()}
            aria-label={t('lawsRegulations.actions.menu')}
            className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <Icon name="ellipsis-vertical" className="text-sm" style="solid" />
          </MenuButton>
          <MenuItems
            anchor={{ to: 'bottom end', gap: 4 }}
            onClick={e => e.stopPropagation()}
            onKeyDown={e => e.stopPropagation()}
            className="z-50 w-36 rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none"
          >
            <MenuItem>
              {({ focus }) => (
                <button
                  type="button"
                  onClick={onOpen}
                  className={clsx(
                    'flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700',
                    focus && 'bg-gray-50',
                  )}
                >
                  <Icon name="pencil" className="text-xs text-gray-400" />
                  {t('lawsRegulations.actions.edit')}
                </button>
              )}
            </MenuItem>
            <MenuItem>
              {({ focus }) => (
                <button
                  type="button"
                  onClick={onDelete}
                  className={clsx(
                    'flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600',
                    focus && 'bg-red-50',
                  )}
                >
                  <Icon name="trash" className="text-xs" />
                  {t('lawsRegulations.actions.delete')}
                </button>
              )}
            </MenuItem>
          </MenuItems>
        </Menu>
      )}
    </div>
  );
};

// Container segments that host the Laws & Regulation tab — drives where law detail
// pages are mounted so the URL prefix is preserved.
const PARENT_SEGMENTS = ['block-condo', 'block-village', 'property-pma', 'property'] as const;

export const LawsRegulationTab = () => {
  const readOnly = usePageReadOnly();
  const { t } = useTranslation('appraisal');
  const navigate = useNavigate();
  const basePath = useBasePath();
  const location = useLocation();
  const appraisalId = useAppraisalId();

  const segments = location.pathname.replace(`${basePath}/`, '').split('/').filter(Boolean);
  const parentSegment =
    (PARENT_SEGMENTS as readonly string[]).find(s => s === segments[0]) ?? 'property';

  const { data, isLoading, isError, error, refetch } = useGetLawAndRegulations(appraisalId);
  const saveMutation = useSaveLawAndRegulations();
  // Item images reference gallery photos; the gallery query is shared with the Gallery tab.
  const { data: galleryData } = useGetGalleryPhotos(appraisalId);

  const items = data?.items ?? [];

  const thumbnailById = useMemo(
    () => new Map((galleryData?.photos ?? []).map(p => [p.id, toGalleryImage(p).thumbnailSrc])),
    [galleryData],
  );

  const [deleteTarget, setDeleteTarget] = useState<LawAndRegulationDtoType | null>(null);

  const handleCreate = () => {
    navigate(`${basePath}/${parentSegment}/law-and-regulation/new`);
  };

  const handleItemClick = (item: LawAndRegulationDtoType) => {
    navigate(`${basePath}/${parentSegment}/law-and-regulation/${item.id}`);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget || !appraisalId) return;

    const remaining = items.filter(i => i.id !== deleteTarget.id);
    saveMutation.mutate(
      {
        appraisalId,
        items: remaining.map(i => ({
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
      },
      {
        onSuccess: () => {
          toast.success(t('lawsRegulations.toasts.deleted'));
          setDeleteTarget(null);
        },
        onError: () => {
          toast.error(t('lawsRegulations.toasts.deleteFailed'));
          setDeleteTarget(null);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Icon name="spinner" style="solid" className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <DataErrorState
        variant="inline"
        title={t('lawsRegulations.loadError')}
        message={(error as Error)?.message}
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">{t('lawsRegulations.pageTitle')}</h3>
          <p className="text-xs text-gray-500">{t('lawsRegulations.count', { n: items.length })}</p>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={handleCreate}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-700"
          >
            <Icon name="plus" style="solid" className="text-[11px]" />
            {t('lawsRegulations.addRecord')}
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-12 text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-gray-50">
            <Icon name="gavel" style="solid" className="text-xl text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-600">{t('lawsRegulations.noRecords')}</p>
          <p className="mt-1 text-xs text-gray-400">{t('lawsRegulations.noRecordsHint')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              thumbnails={[...item.images]
                .sort((a, b) => a.displaySequence - b.displaySequence)
                .map(img => thumbnailById.get(img.galleryPhotoId))
                .filter((src): src is string => !!src)}
              readOnly={readOnly}
              onOpen={() => handleItemClick(item)}
              onDelete={() => setDeleteTarget(item)}
            />
          ))}
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={t('lawsRegulations.deleteConfirm.title')}
        message={t('lawsRegulations.deleteConfirm.message')}
        isLoading={saveMutation.isPending}
      />
    </div>
  );
};

export default LawsRegulationTab;
