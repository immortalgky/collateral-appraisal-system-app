import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import Modal from '@/shared/components/Modal';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { formatLocaleDate } from '@/shared/utils/dateUtils';
import { SoldDonut } from '@/features/blockUnitMaintenance/components/SoldDonut';
import { ModelBreakdown } from '@/features/blockUnitMaintenance/components/ModelBreakdown';
import type { ModelStat } from '@/features/blockUnitMaintenance/components/ModelBreakdown';
import {
  useBlockReappraisalDetail,
  useCreateBlockReappraisal,
  useMarkBlockReappraisalNotRequired,
} from '../api/blockReappraisal';
import type { BlockReappraisalUnitDetail, BlockReappraisalCreateResult } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNumber(n?: number | null): string {
  if (n == null) return '-';
  return n.toLocaleString();
}

function groupByModel(
  units: BlockReappraisalUnitDetail[],
  predicate: (u: BlockReappraisalUnitDetail) => boolean,
): ModelStat[] {
  const map = new Map<string, number>();
  for (const u of units) {
    if (!predicate(u)) continue;
    const key = u.modelType?.trim() || '—';
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([modelName, count]) => ({ modelName, count }))
    .sort((a, b) => b.count - a.count);
}

// ─── Create confirm modal ─────────────────────────────────────────────────────


// ─── Create success modal ─────────────────────────────────────────────────────

interface CreateSuccessModalProps {
  open: boolean;
  result: BlockReappraisalCreateResult;
  onClose: () => void;
}

function CreateSuccessModal({ open, result, onClose }: CreateSuccessModalProps) {
  const { t } = useTranslation(['blockReappraisal', 'common']);
  return (
    <Modal isOpen={open} onClose={onClose} title={t('detail.successModal.title')} size="sm">
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="size-12 rounded-full bg-green-50 flex items-center justify-center">
            <Icon style="solid" name="check" className="size-5 text-green-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-800">
              {t('detail.successModal.heading')}
            </p>
            {result.requestNumber && (
              <p className="text-xs text-gray-500 mt-1">
                {t('detail.successModal.requestNumber')}{' '}
                <strong className="text-gray-800">{result.requestNumber}</strong>
              </p>
            )}
            <p className="text-xs text-gray-500">
              {t('detail.successModal.groupNumber')}{' '}
              <strong className="text-gray-800">{result.groupNumber}</strong>
            </p>
          </div>
        </div>

        {result.skipped && (
          <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2.5">
            <p className="text-xs font-medium text-amber-800">
              {t('detail.successModal.alreadyInProgress')}
            </p>
            {result.skipReason && (
              <p className="text-xs text-amber-700 mt-0.5">{result.skipReason}</p>
            )}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-gray-100">
          <Button variant="primary" size="sm" onClick={onClose}>
            {t('common:actions.close')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Field display pair ───────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-xs font-medium text-gray-800 mt-0.5">{value ?? '-'}</dd>
    </div>
  );
}

// ─── Read-only Condo units table ──────────────────────────────────────────────

function CondoUnitsTable({ units }: { units: BlockReappraisalUnitDetail[] }) {
  const { t } = useTranslation('blockReappraisal');
  return (
    <table className="w-full min-w-max text-xs">
      <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
        <tr>
          <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">#</th>
          <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('units.cols.floor')}
          </th>
          <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('units.cols.towerName')}
          </th>
          <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('units.cols.regNumber')}
          </th>
          <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('units.cols.roomNo')}
          </th>
          <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('units.cols.modelType')}
          </th>
          <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('units.cols.usableArea')}
          </th>
          <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('units.cols.sellingPrice')}
          </th>
          <th className="text-center py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('units.cols.isSold')}
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {units.map(u => (
          <tr key={u.sequenceNumber} className="hover:bg-gray-50">
            <td className="py-2 px-3 text-gray-500 tabular-nums">{u.sequenceNumber}</td>
            <td className="py-2 px-3 text-gray-700">{u.floor ?? '-'}</td>
            <td className="py-2 px-3 text-gray-700">{u.towerName ?? '-'}</td>
            <td className="py-2 px-3 text-gray-700">{u.condoRegistrationNumber ?? '-'}</td>
            <td className="py-2 px-3 text-gray-700">{u.roomNumber ?? '-'}</td>
            <td className="py-2 px-3 text-gray-700">{u.modelType ?? '-'}</td>
            <td className="py-2 px-3 text-gray-700 tabular-nums text-right">
              {formatNumber(u.usableArea)}
            </td>
            <td className="py-2 px-3 text-gray-700 tabular-nums text-right">
              {formatNumber(u.sellingPrice)}
            </td>
            <td className="py-2 px-3 text-center">
              {u.isSold ? (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 border border-red-200">
                  {t('units.sold')}
                </span>
              ) : (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 border border-green-200">
                  {t('units.available')}
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Read-only Land & Building units table ────────────────────────────────────

function LandBuildingUnitsTable({ units }: { units: BlockReappraisalUnitDetail[] }) {
  const { t } = useTranslation('blockReappraisal');
  return (
    <table className="w-full min-w-max text-xs">
      <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
        <tr>
          <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">#</th>
          <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('units.cols.plotNo')}
          </th>
          <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('units.cols.houseNo')}
          </th>
          <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('units.cols.modelType')}
          </th>
          <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('units.cols.numFloors')}
          </th>
          <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('units.cols.landArea')}
          </th>
          <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('units.cols.usableArea')}
          </th>
          <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('units.cols.sellingPrice')}
          </th>
          <th className="text-center py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
            {t('units.cols.isSold')}
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {units.map(u => (
          <tr key={u.sequenceNumber} className="hover:bg-gray-50">
            <td className="py-2 px-3 text-gray-500 tabular-nums">{u.sequenceNumber}</td>
            <td className="py-2 px-3 text-gray-700">{u.plotNumber ?? '-'}</td>
            <td className="py-2 px-3 text-gray-700">{u.houseNumber ?? '-'}</td>
            <td className="py-2 px-3 text-gray-700">{u.modelType ?? '-'}</td>
            <td className="py-2 px-3 text-gray-700">{u.numberOfFloors ?? '-'}</td>
            <td className="py-2 px-3 text-gray-700 tabular-nums text-right">
              {formatNumber(u.landArea)}
            </td>
            <td className="py-2 px-3 text-gray-700 tabular-nums text-right">
              {formatNumber(u.usableArea)}
            </td>
            <td className="py-2 px-3 text-gray-700 tabular-nums text-right">
              {formatNumber(u.sellingPrice)}
            </td>
            <td className="py-2 px-3 text-center">
              {u.isSold ? (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 border border-red-200">
                  {t('units.sold')}
                </span>
              ) : (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 border border-green-200">
                  {t('units.available')}
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function BlockReappraisalDetailPage() {
  const { collateralMasterId } = useParams<{ collateralMasterId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['blockReappraisal', 'common']);

  const {
    data: detail,
    isLoading,
    isError,
    error,
  } = useBlockReappraisalDetail(collateralMasterId ?? '');

  const createMutation = useCreateBlockReappraisal();
  const optOutMutation = useMarkBlockReappraisalNotRequired();

  // Modal states
  const [createConfirmOpen, setCreateConfirmOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successResult, setSuccessResult] = useState<BlockReappraisalCreateResult | null>(null);
  const [optOutConfirmOpen, setOptOutConfirmOpen] = useState(false);

  // Overview chart stats derived from structure units
  const units = detail?.structure.units ?? [];
  const soldStats = useMemo(() => groupByModel(units, u => u.isSold), [units]);
  const availableStats = useMemo(() => groupByModel(units, u => !u.isSold), [units]);

  const handleCreateConfirm = () => {
    if (!collateralMasterId) return;
    createMutation.mutate(collateralMasterId, {
      onSuccess: result => {
        setCreateConfirmOpen(false);
        setSuccessResult(result);
        setSuccessModalOpen(true);
      },
      onError: () => {
        toast.error(t('error.createFailed'));
      },
    });
  };

  const handleOptOutConfirm = () => {
    if (!collateralMasterId) return;
    optOutMutation.mutate(collateralMasterId, {
      onSuccess: () => {
        toast.success(t('success.optOut'));
        navigate('/standalone/block-reappraisal');
      },
      onError: () => {
        toast.error(t('error.optOutFailed'));
      },
    });
  };

  // ── Loading skeleton ──
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="h-6 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ── Error / not found ──
  if (isError || !detail) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="size-12 rounded-full bg-red-50 flex items-center justify-center">
          <Icon style="solid" name="triangle-exclamation" className="size-5 text-red-500" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-800">
            {isError ? t('detail.error.loadFailed') : t('detail.error.notFound')}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{(error as Error)?.message}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/standalone/block-reappraisal')}>
          {t('detail.backToList')}
        </Button>
      </div>
    );
  }

  const isCondo = detail.projectType === 'Condo';

  return (
    <div className="flex flex-col min-h-full min-w-0 gap-4">
      {/* ── Page header ── */}
      <div className="shrink-0 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/standalone/block-reappraisal')}
            className="flex items-center justify-center size-7 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            <Icon style="solid" name="arrow-left" className="size-3.5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-semibold text-gray-900">
                {detail.projectName ?? t('detail.unnamedProject')}
              </h2>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                  isCondo
                    ? 'bg-blue-50 text-blue-700 border border-blue-100'
                    : 'bg-amber-50 text-amber-700 border border-amber-100'
                }`}
              >
                {isCondo ? t('projectType.condo') : t('projectType.landAndBuilding')}
              </span>
            </div>
            {detail.oldAppraisalNumber && (
              <p className="text-xs text-gray-500 mt-0.5">
                {t('detail.oldAppraisalLabel')} {detail.oldAppraisalNumber}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="danger"
            size="sm"
            onClick={() => setOptOutConfirmOpen(true)}
            leftIcon={<Icon style="solid" name="ban" className="size-3" />}
          >
            {t('actions.notRequired')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateConfirmOpen(true)}
            leftIcon={<Icon style="solid" name="play" className="size-3" />}
          >
            {t('actions.createRequest')}
          </Button>
        </div>
      </div>

      {/* ── Summary card ── */}
      <section className="shrink-0 bg-white rounded-lg border border-gray-200 p-4">
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
          <Field
            label={t('columns.lastAppraisedDate')}
            value={formatLocaleDate(detail.lastAppraisedDate, i18n.language)}
          />
          <Field
            label={t('detail.fields.dueDate')}
            value={formatLocaleDate(detail.dueDate, i18n.language)}
          />
          <Field
            label={t('columns.projectSellingPrice')}
            value={formatNumber(detail.projectSellingPrice)}
          />
          <Field
            label={t('columns.remainingTotalUnit')}
            value={`${detail.remainingUnits} / ${detail.totalUnits}`}
          />
        </dl>
      </section>

      {/* ── Sold vs Available overview chart ── */}
      <section className="shrink-0 bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-xs font-semibold text-gray-700 mb-4">{t('detail.overview.title')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center px-2">
          <ModelBreakdown
            heading={t('detail.overview.sold')}
            stats={soldStats}
            emptyLabel={t('detail.overview.noSold')}
            unitSuffix={t('detail.overview.unitSuffix')}
          />
          <div className="flex justify-center">
            <SoldDonut
              sold={detail.soldUnits}
              total={detail.totalUnits}
              soldLabel={t('detail.overview.donutSoldLabel')}
            />
          </div>
          <ModelBreakdown
            heading={t('detail.overview.available')}
            stats={availableStats}
            emptyLabel={t('detail.overview.noAvailable')}
            unitSuffix={t('detail.overview.unitSuffix')}
          />
        </div>
      </section>

      {/* ── Units table (read-only) ── */}
      <section className="flex-1 min-h-[24rem] bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
        <div className="shrink-0 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-700">{t('detail.units.title')}</h3>
          <span className="text-xs text-gray-400 tabular-nums">
            {detail.structure.units.length} {t('detail.units.count')}
          </span>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          {detail.structure.units.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <Icon style="regular" name="folder-open" className="size-8 text-gray-300" />
              <p className="text-xs text-gray-400">{t('detail.units.empty')}</p>
            </div>
          ) : isCondo ? (
            <CondoUnitsTable units={detail.structure.units} />
          ) : (
            <LandBuildingUnitsTable units={detail.structure.units} />
          )}
        </div>
      </section>

      {/* ── Modals ── */}
      <ConfirmDialog
        isOpen={createConfirmOpen}
        onClose={() => setCreateConfirmOpen(false)}
        onConfirm={handleCreateConfirm}
        title={t('detail.createModal.title')}
        message={t('detail.createModal.body')}
        confirmText={t('common:actions.confirm')}
        cancelText={t('common:actions.cancel')}
        variant="primary"
        isLoading={createMutation.isPending}
      />

      {successResult && (
        <CreateSuccessModal
          open={successModalOpen}
          result={successResult}
          onClose={() => {
            setSuccessModalOpen(false);
            navigate('/standalone/block-reappraisal');
          }}
        />
      )}

      <ConfirmDialog
        isOpen={optOutConfirmOpen}
        onClose={() => setOptOutConfirmOpen(false)}
        onConfirm={handleOptOutConfirm}
        title={t('detail.optOutModal.title')}
        message={t('detail.optOutModal.body')}
        confirmText={t('detail.optOutModal.confirm')}
        cancelText={t('common:actions.cancel')}
        variant="danger"
        isLoading={optOutMutation.isPending}
      />
    </div>
  );
}

export default BlockReappraisalDetailPage;
