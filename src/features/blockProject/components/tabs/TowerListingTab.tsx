import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import type { AxiosError } from 'axios';

import { useAppraisalId, useBasePath } from '@/features/appraisal/context/AppraisalContext';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useGetProjectTowers, useDeleteProjectTower } from '../../api/projectTower';
import type { ApiError } from '@/shared/types/api';
import Icon from '@shared/components/Icon';
import Badge from '@/shared/components/Badge';
import Button from '@shared/components/Button';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { formatNumber } from '@/shared/utils/formatUtils';
import { CondoListPane, CondoThumb, Dash, RowActions } from '../condo/towersModels/CondoListPane';
import {
  openRowProps,
  rowClass,
  tdClass,
  tdNumClass,
  thClass,
  thNumClass,
} from '../condo/towersModels/listStyles';
import {
  useCoverThumbnails,
  useTowerModelFigures,
} from '../condo/towersModels/useTowerModelFigures';

type AppError = AxiosError & { apiError?: ApiError };

/**
 * Condo-only tab listing project towers, one table: the unit count the appraiser entered next to
 * the one the unit list gives, so a tower that disagrees with its units shows here.
 * Navigation uses block-condo route segment (Towers are Condo-only). Rendered inside CondoFrame.
 */
export default function TowerListingTab() {
  const { t } = useTranslation('blockProject');
  const appraisalId = useAppraisalId();
  const basePath = useBasePath();
  const navigate = useNavigate();
  const readOnly = usePageReadOnly();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { isLoading, isError } = useGetProjectTowers(appraisalId ?? '');
  const { mutate: deleteTower, isPending: isDeleting } = useDeleteProjectTower();
  const { towers, unitTotal, hasUnits, unitsOfTower, modelsOfTower } = useTowerModelFigures();
  const thumbnailByTowerId = useCoverThumbnails(towers);

  const openTower = (towerId: string) => navigate(`${basePath}/block-condo/tower/${towerId}`);

  const handleDeleteConfirm = () => {
    if (readOnly || !appraisalId || !deleteTarget) return;
    deleteTower(
      { appraisalId, towerId: deleteTarget.id },
      {
        onSuccess: () => {
          toast.success(t('toasts.tower.deleteSuccess'));
          setDeleteTarget(null);
        },
        onError: (err: unknown) => {
          const error = err as AppError;
          toast.error(error?.apiError?.detail ?? t('toasts.tower.deleteFailed'));
          setDeleteTarget(null);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true">
        <div className="h-10 animate-pulse rounded-lg bg-(--palette-line)" />
        {[1, 2, 3].map(i => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-(--palette-surface-3)" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-(--palette-req-line) bg-(--palette-req-wash) py-16">
        <Icon name="exclamation-triangle" className="mb-3 text-4xl text-red-400" />
        <p className="text-sm font-medium text-red-500">
          {t('condoTowersModels.towers.loadFailed')}
        </p>
        <p className="mt-1 text-xs text-red-400">{t('condoTowersModels.towers.loadFailedHint')}</p>
      </div>
    );
  }

  return (
    <>
      <CondoListPane
        title={t('condoTowersModels.towers.title')}
        hint={t('condoTowersModels.towers.summary', {
          towers: formatNumber(towers.length),
          units: formatNumber(unitTotal),
        })}
        action={
          !readOnly && (
            <Button
              size="sm"
              leftIcon={<Icon name="plus" style="solid" />}
              onClick={() => navigate(`${basePath}/block-condo/tower/new`)}
            >
              {t('condoTowersModels.towers.add')}
            </Button>
          )
        }
      >
        {towers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-(--palette-ink-2)">
            <Icon name="building" className="mb-3 text-4xl" />
            <p className="text-sm font-medium text-(--palette-ink-2)">
              {t('condoTowersModels.towers.empty')}
            </p>
            <p className="mt-1 text-xs text-(--palette-ink-2)">
              {t('condoTowersModels.towers.emptyHint')}
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[52rem] text-table">
            <thead className="sticky top-0 z-10 bg-(--palette-surface-2)">
              <tr>
                <th className={`${thClass} w-16`}>
                  <span className="sr-only">{t('condoTowersModels.towers.cols.image')}</span>
                </th>
                <th className={thClass}>{t('condoTowersModels.towers.cols.name')}</th>
                <th className={thClass}>{t('condoTowersModels.towers.cols.registration')}</th>
                <th className={thNumClass}>{t('condoTowersModels.towers.cols.entered')}</th>
                <th className={thNumClass}>{t('condoTowersModels.towers.cols.counted')}</th>
                <th className={thNumClass}>{t('condoTowersModels.towers.cols.sold')}</th>
                <th className={thNumClass}>{t('condoTowersModels.towers.cols.models')}</th>
                <th className={thNumClass}>{t('condoTowersModels.towers.cols.floors')}</th>
                <th className={`${thClass} w-20`}>
                  <span className="sr-only">{t('condoTowersModels.towers.cols.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--palette-line-soft)">
              {towers.map(tower => {
                const name = tower.towerName?.trim() || t('towerListing.unnamedTower');
                const counted = unitsOfTower(tower);
                const entered = tower.numberOfUnits;
                const diff = counted.total - (entered ?? 0);
                return (
                  <tr
                    key={tower.id}
                    className={rowClass}
                    {...openRowProps(() => openTower(tower.id))}
                  >
                    <td className={tdClass}>
                      <CondoThumb
                        src={thumbnailByTowerId.get(tower.id)}
                        alt={name}
                        icon="building"
                      />
                    </td>
                    <td className={`${tdClass} max-w-[16rem] font-medium text-(--palette-ink)`}>
                      <div className="truncate" title={name}>
                        {name}
                      </div>
                    </td>
                    <td className={`${tdClass} text-(--palette-ink)`}>
                      {tower.condoRegistrationNumber || <Dash />}
                    </td>
                    <td className={tdNumClass}>
                      {entered != null ? formatNumber(entered) : <Dash />}
                    </td>
                    <td className={tdNumClass}>
                      {hasUnits ? (
                        <span className="inline-flex items-center justify-end gap-2">
                          {formatNumber(counted.total)}
                          {entered != null &&
                            (diff === 0 ? (
                              <Badge tone="green" dot={false} className="whitespace-nowrap">
                                {t('condoTowersModels.towers.match')}
                              </Badge>
                            ) : (
                              <Badge tone="yellow" dot={false} className="whitespace-nowrap">
                                {t('condoTowersModels.towers.differs', {
                                  diff: `${diff > 0 ? '+' : ''}${formatNumber(diff)}`,
                                })}
                              </Badge>
                            ))}
                        </span>
                      ) : (
                        <Dash />
                      )}
                    </td>
                    <td className={tdNumClass}>
                      {hasUnits ? formatNumber(counted.sold) : <Dash />}
                    </td>
                    <td className={tdNumClass}>{formatNumber(modelsOfTower(tower))}</td>
                    <td className={tdNumClass}>
                      {tower.numberOfFloors != null ? formatNumber(tower.numberOfFloors) : <Dash />}
                    </td>
                    <td className={tdClass}>
                      <RowActions
                        deleteLabel={t('towerListing.aria.deleteTower')}
                        onDelete={
                          readOnly ? undefined : () => setDeleteTarget({ id: tower.id, name })
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </CondoListPane>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={t('dialogs.deleteTowerListing.title')}
        message={t('dialogs.deleteListing.message', { name: deleteTarget?.name ?? '' })}
        confirmText={t('dialogs.deleteTowerListing.confirm')}
        isLoading={isDeleting}
      />
    </>
  );
}
