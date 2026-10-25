import { Fragment, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import type { AxiosError } from 'axios';

import { useAppraisalId, useBasePath } from '@/features/appraisal/context/AppraisalContext';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import Badge from '@/shared/components/Badge';
import Button from '@/shared/components/Button';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import Icon from '@/shared/components/Icon';
import { useParameterDescription } from '@/shared/utils/parameterUtils';
import { formatNumber } from '@/shared/utils/formatUtils';
import type { ApiError } from '@/shared/types/api';

import { useDeleteProjectModel, useGetProjectModels } from '../../../api/projectModel';
import type { ProjectModel, ProjectType } from '../../../types';
import { CondoListPane, CondoThumb, Dash, RowActions } from './CondoListPane';
import { openRowProps, rowClass, tdClass, tdNumClass, thClass, thNumClass } from './listStyles';
import { formatRange } from './format';
import { useCoverThumbnails, useTowerModelFigures, type UnitCount } from './useTowerModelFigures';

type AppError = AxiosError & { apiError?: ApiError };
type Filter = 'all' | 'pending';

const COLUMNS = 8;

const isPending = (model: ProjectModel) => model.finalAppraisedValue == null;

function FilterChip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={clsx(
        'rounded-full border px-3 py-1 text-sm',
        active
          ? 'border-primary bg-primary/10 font-semibold text-(--palette-accent-ink)'
          : 'border-(--palette-line-strong) bg-(--palette-surface) text-(--palette-ink-2) hover:bg-(--palette-surface-2)',
      )}
    >
      {label}
      <span className="ml-1.5 text-xs tabular-nums">{count}</span>
    </button>
  );
}

interface ModelRowProps {
  model: ProjectModel;
  /** Land and Building: a house model, priced per house, with land instead of a room layout. */
  village: boolean;
  towerName?: string;
  units: UnitCount;
  hasUnits: boolean;
  thumbnailSrc?: string;
  readOnly: boolean;
  onOpen: () => void;
  onDelete: () => void;
}

function ModelRow({
  model,
  village,
  towerName,
  units,
  hasUnits,
  thumbnailSrc,
  readOnly,
  onOpen,
  onDelete,
}: ModelRowProps) {
  const { t } = useTranslation('blockProject');
  const roomLayout = useParameterDescription('RoomLayout', model.roomLayoutType);
  const name = model.modelName?.trim() || t('modelListing.unnamedModel');
  const area = formatRange(model.usableAreaMin, model.usableAreaMax);
  const price = formatRange(model.startingPriceMin, model.startingPriceMax);

  return (
    <tr className={rowClass} {...openRowProps(onOpen)}>
      <td className={tdClass}>
        <CondoThumb src={thumbnailSrc} alt={name} icon={village ? 'house' : 'layer-group'} />
      </td>
      <td className={`${tdClass} max-w-[20rem] font-medium text-(--palette-ink)`}>
        <div className="flex items-center gap-2">
          <span className="truncate" title={name}>
            {name}
          </span>
          {towerName && (
            <span
              title={towerName}
              className="inline-flex max-w-[8rem] shrink-0 items-center rounded-md border border-primary-100 dark:border-primary-500/20 bg-(--palette-accent-wash) px-1.5 text-xs font-semibold text-(--palette-accent-ink)"
            >
              <span className="truncate">{towerName}</span>
            </span>
          )}
        </div>
      </td>
      <td className={tdNumClass}>
        {!hasUnits ? (
          <Dash />
        ) : village ? (
          <>
            {formatNumber(units.total)}
            <span className="ml-1 text-(--palette-ink-2)">({formatNumber(units.sold)})</span>
          </>
        ) : (
          formatNumber(units.total)
        )}
      </td>
      <td className={tdNumClass}>{area ?? <Dash />}</td>
      {village ? (
        <>
          <td className={tdNumClass}>
            {model.standardLandArea ? formatNumber(model.standardLandArea, 2) : <Dash />}
          </td>
          <td className={tdNumClass}>{price ?? <Dash />}</td>
        </>
      ) : (
        <>
          <td className={tdNumClass}>{price ?? <Dash />}</td>
          <td className={`${tdClass} text-(--palette-ink)`}>{roomLayout || <Dash />}</td>
        </>
      )}
      <td className={tdClass}>
        {isPending(model) ? (
          <Badge tone="yellow" dot={false} className="whitespace-nowrap">
            {t('condoTowersModels.models.pending')}
          </Badge>
        ) : (
          <Badge tone="green" dot={false} className="whitespace-nowrap">
            {t(
              village ? 'lbLists.models.standardPrice' : 'condoTowersModels.models.standardPrice',
              { price: formatNumber(model.finalAppraisedValue as number, 2) },
            )}
          </Badge>
        )}
      </td>
      <td className={tdClass}>
        <RowActions
          deleteLabel={t('modelListing.aria.deleteModel')}
          onDelete={readOnly ? undefined : onDelete}
        />
      </td>
    </tr>
  );
}

/**
 * The model list of Condo and Land and Building: one table with a "waiting for analysis" filter.
 * Condo can group it by tower; a village has no towers, so its models are one list by name, priced
 * per house (baht / house) where Condo's is per sq.m. No grid-card view and no per-row pricing
 * button; pricing lives in the model's detail page. L has no models (ModelListingTab).
 */
export default function CondoModelListing({
  projectType = 'U',
}: {
  projectType?: Exclude<ProjectType, 'L'>;
}) {
  const { t } = useTranslation('blockProject');
  const appraisalId = useAppraisalId();
  const basePath = useBasePath();
  const navigate = useNavigate();
  const readOnly = usePageReadOnly();
  const village = projectType === 'LB';
  const routeSegment = village ? 'block-village' : 'block-condo';
  const [filter, setFilter] = useState<Filter>('all');
  const [grouped, setGrouped] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { isLoading, isError } = useGetProjectModels(appraisalId ?? '');
  const { mutate: deleteModel, isPending: isDeleting } = useDeleteProjectModel();
  const { models, towers, hasUnits, unitsOfModel, towerNameOfModel } = useTowerModelFigures();
  const thumbnailByModelId = useCoverThumbnails(models);

  const openModel = (modelId: string) => navigate(`${basePath}/${routeSegment}/model/${modelId}`);

  const handleDeleteConfirm = () => {
    if (readOnly || !appraisalId || !deleteTarget) return;
    deleteModel(
      { appraisalId, modelId: deleteTarget.id },
      {
        onSuccess: () => {
          toast.success(t('toasts.model.deleteSuccess'));
          setDeleteTarget(null);
        },
        onError: (err: unknown) => {
          const error = err as AppError;
          toast.error(error?.apiError?.detail ?? t('toasts.model.deleteFailed'));
          setDeleteTarget(null);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true">
        <div className="h-10 animate-pulse rounded-lg bg-(--palette-line)" />
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-(--palette-surface-3)" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-red-200 bg-red-50 py-16 dark:border-(--palette-danger)/40 dark:bg-(--palette-req-wash)">
        <Icon
          name="exclamation-triangle"
          className="mb-3 text-4xl text-danger-600 dark:text-(--palette-danger)"
        />
        <p className="text-sm font-medium text-danger-600 dark:text-(--palette-danger)">
          {t('modelListing.failedToLoad')}
        </p>
        <p className="mt-1 text-xs text-danger-600 dark:text-(--palette-danger)">
          {t('modelListing.failedToLoadHint')}
        </p>
      </div>
    );
  }

  const pendingCount = models.filter(isPending).length;
  const shown = filter === 'pending' ? models.filter(isPending) : models;

  const renderRow = (model: ProjectModel) => (
    <ModelRow
      key={model.id}
      model={model}
      village={village}
      towerName={towerNameOfModel(model)}
      units={unitsOfModel(model)}
      hasUnits={hasUnits}
      thumbnailSrc={thumbnailByModelId.get(model.id)}
      readOnly={readOnly}
      onOpen={() => openModel(model.id)}
      onDelete={() =>
        setDeleteTarget({
          id: model.id,
          name: model.modelName?.trim() || t('modelListing.unnamedModel'),
        })
      }
    />
  );

  // One block per tower in list order, then the models whose tower is gone or was never set.
  const knownTowerIds = new Set(towers.map(tower => tower.id));
  const groups = [
    ...towers.map(tower => ({
      id: tower.id,
      name: tower.towerName?.trim() || t('towerListing.unnamedTower'),
      models: shown.filter(m => m.projectTowerId === tower.id),
    })),
    {
      id: 'none',
      name: undefined,
      models: shown.filter(m => !m.projectTowerId || !knownTowerIds.has(m.projectTowerId)),
    },
  ].filter(g => g.models.length > 0);

  let body;
  if (models.length === 0) {
    body = (
      <div className="flex flex-col items-center justify-center py-16 text-(--palette-ink-2)">
        <Icon name={village ? 'house' : 'layer-group'} className="mb-3 text-4xl" />
        <p className="text-sm font-medium text-(--palette-ink-2)">{t('modelListing.noModels')}</p>
        <p className="mt-1 text-xs text-(--palette-ink-2)">{t('modelListing.noModelsHint')}</p>
      </div>
    );
  } else {
    body = (
      <table className="w-full min-w-[56rem] text-table">
        <thead className="sticky top-0 z-10 bg-(--palette-surface-2)">
          <tr>
            <th className={`${thClass} w-16`}>
              <span className="sr-only">{t('condoTowersModels.models.cols.image')}</span>
            </th>
            {village ? (
              <>
                <th className={thClass}>{t('modelListing.cols.modelName')}</th>
                <th className={thNumClass}>{t('lbLists.models.cols.units')}</th>
                <th className={thNumClass}>{t('condoTowersModels.models.cols.usableArea')}</th>
                <th className={thNumClass}>{t('lbLists.models.cols.standardLandArea')}</th>
                <th className={thNumClass}>{t('condoTowersModels.models.cols.startingPrice')}</th>
                <th className={thClass}>{t('lbLists.models.cols.standardPrice')}</th>
              </>
            ) : (
              <>
                <th className={thClass}>{t('condoTowersModels.models.cols.name')}</th>
                <th className={thNumClass}>{t('condoTowersModels.models.cols.units')}</th>
                <th className={thNumClass}>{t('condoTowersModels.models.cols.usableArea')}</th>
                <th className={thNumClass}>{t('condoTowersModels.models.cols.startingPrice')}</th>
                <th className={thClass}>{t('condoTowersModels.models.cols.roomLayout')}</th>
                <th className={thClass}>{t('condoTowersModels.models.cols.standardPrice')}</th>
              </>
            )}
            <th className={`${thClass} w-20`}>
              <span className="sr-only">{t('condoTowersModels.models.cols.actions')}</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-(--palette-line-soft)">
          {shown.length === 0 ? (
            <tr>
              <td colSpan={COLUMNS} className="px-4 py-6 text-center text-(--palette-ink-2)">
                {t('condoTowersModels.models.allPriced')}
              </td>
            </tr>
          ) : grouped && !village ? (
            groups.map(group => (
              <Fragment key={group.id}>
                <tr>
                  <td
                    colSpan={COLUMNS}
                    className="bg-(--palette-surface-2) px-4 py-2 text-xs font-semibold text-(--palette-ink)"
                  >
                    {t(
                      group.name
                        ? 'condoTowersModels.models.groupHead'
                        : 'condoTowersModels.models.groupHeadNoTower',
                      {
                        tower: group.name,
                        models: formatNumber(group.models.length),
                        units: formatNumber(
                          group.models.reduce((sum, m) => sum + unitsOfModel(m).total, 0),
                        ),
                      },
                    )}
                  </td>
                </tr>
                {group.models.map(renderRow)}
              </Fragment>
            ))
          ) : (
            shown.map(renderRow)
          )}
        </tbody>
      </table>
    );
  }

  return (
    <>
      <CondoListPane
        title={t('condoTowersModels.models.title')}
        hint={t('condoTowersModels.models.summary', {
          models: formatNumber(models.length),
          priced: formatNumber(models.length - pendingCount),
          pending: formatNumber(pendingCount),
        })}
        toolbar={
          <>
            <div className="flex flex-wrap gap-1.5">
              <FilterChip
                active={filter === 'all'}
                label={t('condoTowersModels.models.filterAll')}
                count={models.length}
                onClick={() => setFilter('all')}
              />
              <FilterChip
                active={filter === 'pending'}
                label={t('condoTowersModels.models.filterPending')}
                count={pendingCount}
                onClick={() => setFilter('pending')}
              />
            </div>
            {!village && (
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-(--palette-ink-2)">
                <input
                  type="checkbox"
                  checked={grouped}
                  onChange={e => setGrouped(e.target.checked)}
                  className="accent-primary"
                />
                {t('condoTowersModels.models.groupByTower')}
              </label>
            )}
          </>
        }
        action={
          !readOnly && (
            <Button
              size="sm"
              leftIcon={<Icon name="plus" style="solid" />}
              onClick={() => navigate(`${basePath}/${routeSegment}/model/new`)}
            >
              {t('modelListing.addModel')}
            </Button>
          )
        }
      >
        {body}
      </CondoListPane>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={t('dialogs.deleteModelListing.title')}
        message={t('dialogs.deleteListing.message', { name: deleteTarget?.name ?? '' })}
        confirmText={t('dialogs.deleteModelListing.confirm')}
        isLoading={isDeleting}
      />
    </>
  );
}
