import { useMemo, useState, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import Modal from '@/shared/components/Modal';
import { HistorySearchMapDrawer } from '@/features/common/historySearch/HistorySearchMapDrawer';
import type { AppraisalPinDto } from '@/features/common/historySearch/types';
import { formatLocaleDate } from '@/shared/utils/dateUtils';
import {
  useReappraisalCandidateDetail,
  useInitiateReappraisal,
  useDeleteReappraisalCandidate,
} from '../api/reappraisal';
import type { NearbyReappraisalCandidate, SkippedReappraisalItem } from '../types';
import { useAuthStore } from '@/features/auth/store';
import { useBreadcrumb } from '@shared/hooks/useBreadcrumb';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Calendar-accurate diff between two dates as { years, months, days, sign }.
 *  Uses real month lengths (borrows from the previous month when day-of-month underflows),
 *  so e.g. 2020-01-31 → 2020-03-01 = 1 month 0 day (not "29 days" / "30 days"). */
function diffYMD(from: Date, to: Date): { y: number; m: number; d: number; sign: 1 | -1 } {
  const sign: 1 | -1 = from <= to ? 1 : -1;
  const a = sign === 1 ? from : to;
  const b = sign === 1 ? to : from;
  let y = b.getFullYear() - a.getFullYear();
  let m = b.getMonth() - a.getMonth();
  let d = b.getDate() - a.getDate();
  if (d < 0) {
    m--;
    // last day of the previous month of `b`
    d += new Date(b.getFullYear(), b.getMonth(), 0).getDate();
  }
  if (m < 0) {
    y--;
    m += 12;
  }
  return { y, m, d, sign };
}

interface DurationLabels {
  year: string;
  month: string;
  day: string;
}

/** Format a duration between two ISO dates as "X year Y month Z day" (labels localized).
 *  Negative directions get a leading "-". Returns "-" when either input is missing/invalid. */
function formatDateDiff(
  fromIso: string | null | undefined,
  toIso: string | null | undefined,
  labels: DurationLabels,
): string {
  if (!fromIso || !toIso) return '-';
  const a = new Date(fromIso);
  const b = new Date(toIso);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return '-';
  const { y, m, d, sign } = diffYMD(a, b);
  const parts: string[] = [];
  if (y > 0) parts.push(`${y} ${labels.year}`);
  if (m > 0) parts.push(`${m} ${labels.month}`);
  if (d > 0 || parts.length === 0) parts.push(`${d} ${labels.day}`);
  return (sign < 0 ? '-' : '') + parts.join(' ');
}

/** ISO yyyy-MM-dd for "appraisalDate + N years" — used to derive the review/next-due date. */
function addYearsISO(iso?: string | null, years = 5): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString();
}

const TODAY_ISO = new Date().toISOString();

function formatNumber(n?: number): string {
  if (n == null) return '-';
  return n.toLocaleString();
}

/** Stable identity token for a nearby row — matches Initiate partitioning logic. */
function rowToken(c: NearbyReappraisalCandidate): string {
  return (c.appraisalId ?? c.candidateId) as string;
}

// ─── Source badge ─────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: NearbyReappraisalCandidate['source'] }) {
  const { t } = useTranslation('reappraisal');
  if (source === 'InSystem') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700">
        {t('detail.source.inSystem')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700">
      SIBS
    </span>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({
  status,
  hasOpenAppraisal,
  openAppraisalNumber,
  openAppraisalGroupTag,
  openAppraisalId,
}: {
  status: string;
  hasOpenAppraisal: boolean;
  openAppraisalNumber?: string;
  openAppraisalGroupTag?: string;
  openAppraisalId?: string;
}) {
  const { t } = useTranslation('reappraisal');
  let badge: ReactNode;

  if (status === 'Consumed') {
    badge = (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
        {t('badge.used')}
      </span>
    );
  } else if (status === 'Pending' && hasOpenAppraisal) {
    badge = (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
        {t('badge.inProgress')}
      </span>
    );
  } else {
    badge = (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 border border-green-200">
        {t('badge.pending')}
      </span>
    );
  }

  const hasLink = openAppraisalNumber != null;

  return (
    <div className="flex items-center gap-2">
      {badge}
      {hasLink && (
        <span
          className="text-[10px] text-gray-400"
          data-appraisal-id={openAppraisalId}
          title={openAppraisalGroupTag != null ? `Group ${openAppraisalGroupTag}` : undefined}
        >
          → {openAppraisalNumber}
          {openAppraisalGroupTag != null && (
            <span className="ml-1 text-gray-300">· {openAppraisalGroupTag}</span>
          )}
        </span>
      )}
    </div>
  );
}

// ─── Label / value display pair ───────────────────────────────────────────────

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-xs font-medium text-gray-800 mt-0.5">{value ?? '-'}</dd>
    </div>
  );
}

// ─── Delete confirmation modal ────────────────────────────────────────────────

interface DeleteConfirmModalProps {
  open: boolean;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

function DeleteConfirmModal({ open, isPending, onConfirm, onClose }: DeleteConfirmModalProps) {
  const { t } = useTranslation(['reappraisal', 'common']);
  return (
    <Modal isOpen={open} onClose={onClose} title={t('detail.deleteModal.title')} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-700">{t('detail.deleteModal.body')}</p>
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isPending}>
            {t('common:actions.cancel')}
          </Button>
          <Button variant="danger" size="sm" onClick={onConfirm} isLoading={isPending}>
            {t('common:actions.delete')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Initiate confirmation modal ──────────────────────────────────────────────

interface InitiateConfirmModalProps {
  open: boolean;
  isPending: boolean;
  selectedCount: number;
  onConfirm: () => void;
  onClose: () => void;
}

function InitiateConfirmModal({
  open,
  isPending,
  selectedCount,
  onConfirm,
  onClose,
}: InitiateConfirmModalProps) {
  const { t } = useTranslation(['reappraisal', 'common']);
  return (
    <Modal isOpen={open} onClose={onClose} title={t('detail.initiateModal.title')} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-700">
          {t('detail.initiateModal.body', { count: selectedCount })}
        </p>
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isPending}>
            {t('common:actions.cancel')}
          </Button>
          <Button variant="primary" size="sm" onClick={onConfirm} isLoading={isPending}>
            {t('common:actions.confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Success modal ────────────────────────────────────────────────────────────

interface InitiateSuccessModalProps {
  open: boolean;
  groupNumber: string;
  createdCount: number;
  skipped: SkippedReappraisalItem[];
  onClose: () => void;
}

function InitiateSuccessModal({
  open,
  groupNumber,
  createdCount,
  skipped,
  onClose,
}: InitiateSuccessModalProps) {
  const { t } = useTranslation(['reappraisal', 'common']);
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
            <p className="text-xs text-gray-500 mt-1">
              {t('detail.successModal.groupNumber')}{' '}
              <strong className="text-gray-800">{groupNumber}</strong>
            </p>
            <p className="text-xs text-gray-500">
              {t('detail.successModal.created', { count: createdCount })}
            </p>
          </div>
        </div>

        {skipped.length > 0 && (
          <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2.5">
            <p className="text-xs font-medium text-amber-800 mb-1.5">
              {t('detail.successModal.skipped', { count: skipped.length })}
            </p>
            <ul className="space-y-0.5">
              {skipped.map(s => (
                <li key={s.appraisalId} className="text-xs text-amber-700">
                  {s.oldAppraisalReportNumber}
                </li>
              ))}
            </ul>
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

// ─── Main component ───────────────────────────────────────────────────────────

function ReappraisalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['reappraisal', 'common']);
  const user = useAuthStore(s => s.user);

  const { data: detail, isLoading, isError, error } = useReappraisalCandidateDetail(id ?? '');
  const initiateMutation = useInitiateReappraisal();
  const deleteMutation = useDeleteReappraisalCandidate();

  // Breadcrumb: Home › Reappraisal (AS400) › <appraisal number>
  useBreadcrumb(detail?.oldAppraisalReportNumber, 'folder-open');

  // Selected nearby rows — keyed by (appraisalId ?? candidateId)
  const [selectedNearbyTokens, setSelectedNearbyTokens] = useState<Set<string>>(new Set());

  // Modal states
  const [initiateConfirmOpen, setInitiateConfirmOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successResult, setSuccessResult] = useState<{
    groupNumber: string;
    createdCount: number;
    skipped: SkippedReappraisalItem[];
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);

  // Overlay pins for the map drawer: the main appraisal + every nearby group
  // candidate that has coordinates, rendered as always-visible "appraising" markers
  // over the surrounding history-search backdrop. SIBS rows not yet geo-enriched
  // (null lat/lon) are simply absent from the map.
  const groupPins = useMemo<AppraisalPinDto[]>(() => {
    if (!detail || detail.latitude == null || detail.longitude == null) return [];
    const pins: AppraisalPinDto[] = [
      {
        // Real in-system appraisal id (empty when AS400-only) — NOT the candidate id.
        // The pin detail drawer fetches appraisal data with this; an empty value
        // keeps it from querying a non-existent appraisal.
        appraisalId: detail.appraisalId ?? '',
        appraisalNumber: detail.oldAppraisalReportNumber,
        lat: detail.latitude,
        lon: detail.longitude,
        propertyType: null,
        buildingType: null,
        appraisedValue: null,
        appraisedDate: detail.appraisalDate ?? null,
        distanceKm: 0,
        province: null,
        district: null,
        subDistrict: null,
        customerName: detail.customerName ?? null,
      },
    ];
    for (const c of detail.nearbyGroupCandidates) {
      if (c.latitude == null || c.longitude == null) continue;
      pins.push({
        // Real in-system appraisal id only; candidateId is NOT an appraisal id.
        // Empty for SIBS-pending rows with no in-system match.
        appraisalId: c.appraisalId ?? '',
        appraisalNumber: c.oldAppraisalReportNumber,
        lat: c.latitude,
        lon: c.longitude,
        propertyType: null,
        buildingType: null,
        appraisedValue: null,
        appraisedDate: c.appraisalDate ?? null,
        distanceKm: c.distanceKm ?? null,
        province: null,
        district: null,
        subDistrict: null,
        customerName: c.customerName ?? null,
      });
    }
    return pins;
  }, [detail]);

  const durationLabels: DurationLabels = {
    year: t('detail.duration.year'),
    month: t('detail.duration.month'),
    day: t('detail.duration.day'),
  };

  const toggleNearby = (token: string) => {
    setSelectedNearbyTokens(prev => {
      const next = new Set(prev);
      if (next.has(token)) {
        next.delete(token);
      } else {
        next.add(token);
      }
      return next;
    });
  };

  // The main candidate is always included; nearby selections are additive
  const totalSelected = 1 + selectedNearbyTokens.size;

  const handleInitiateConfirm = () => {
    if (!detail || !user) return;

    // Partition selected nearby tokens back into their respective ID arrays.
    // We need the original row objects to know which id field to use.
    const selectedRows = detail.nearbyGroupCandidates.filter(c =>
      selectedNearbyTokens.has(rowToken(c)),
    );

    const candidateIds: string[] = [detail.id];
    const nearbyAppraisalIds: string[] = [];

    for (const row of selectedRows) {
      if (row.candidateId) {
        // Has a Pending candidate row — goes into candidateIds
        candidateIds.push(row.candidateId);
      } else if (row.appraisalId) {
        // InSystem-only (no candidate row) — goes into nearbyAppraisalIds
        nearbyAppraisalIds.push(row.appraisalId);
      }
    }

    // Project convention: Request.Requestor/Creator store the bank user CODE (e.g. "P5229"),
    // which is held in `user.username` on the FE auth model — NOT the Guid `user.id`.
    // `username` field on the wire DTO carries the display name (`user.name`).
    const userInfo = { userId: user.username, username: user.name };

    initiateMutation.mutate(
      { candidateIds, nearbyAppraisalIds, requestor: userInfo, creator: userInfo },
      {
        onSuccess: result => {
          setInitiateConfirmOpen(false);
          setSuccessResult({
            groupNumber: result.groupNumber,
            createdCount: result.createdRequestIds.length,
            skipped: result.skipped ?? [],
          });
          setSuccessModalOpen(true);
        },
      },
    );
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget, {
      onSuccess: () => {
        setDeleteTarget(null);
        // If deleting the main candidate, go back to list
        if (deleteTarget === detail?.id) {
          navigate('/reappraisal');
        } else {
          // Remove from selection if it was selected (candidateId was used as token)
          setSelectedNearbyTokens(prev => {
            const next = new Set(prev);
            next.delete(deleteTarget);
            return next;
          });
        }
      },
    });
  };

  const handleViewOnMap = () => {
    // Null-check (not truthy) so valid 0 coords still open the map.
    if (detail?.latitude == null || detail?.longitude == null) return;
    setMapOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="h-6 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

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
        <Button variant="outline" size="sm" onClick={() => navigate('/reappraisal')}>
          {t('detail.backToList')}
        </Button>
      </div>
    );
  }

  // Determine whether the Initiate button should be disabled and the banner shown.
  const isBlocked = detail.status !== 'Pending' || detail.hasOpenAppraisal === true;

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 gap-4">
      {/* ── Page header ── */}
      <div className="shrink-0 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/reappraisal')}
            className="flex items-center justify-center size-7 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            <Icon style="solid" name="arrow-left" className="size-3.5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900">
                {detail.oldAppraisalReportNumber}
              </h2>
              <StatusBadge
                status={detail.status}
                hasOpenAppraisal={detail.hasOpenAppraisal}
                openAppraisalNumber={detail.openAppraisalNumber}
                openAppraisalGroupTag={detail.openAppraisalGroupTag}
                openAppraisalId={detail.openAppraisalId}
              />
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {detail.customerName ?? detail.cifNumber} &middot;{' '}
              {t(`reviewType.${detail.reviewType}`, { defaultValue: detail.reviewType })}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Null-check (not truthy) — valid lat/lon may be 0, and `0 && X` renders the literal 0 in JSX. */}
          {detail.latitude != null && detail.longitude != null && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewOnMap}
              leftIcon={<Icon style="solid" name="map-location-dot" className="size-3.5" />}
            >
              {t('actions.viewOnMap')}
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={isBlocked ? undefined : () => setInitiateConfirmOpen(true)}
            disabled={isBlocked}
            title={isBlocked ? t('detail.blockedTitle') : undefined}
            leftIcon={<Icon style="solid" name="play" className="size-3" />}
          >
            {t('actions.initiate')}
          </Button>
        </div>
      </div>

      {/* ── In-progress / consumed banner ── */}
      {isBlocked && (
        <div className="shrink-0 rounded-md bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-3">
          <Icon
            style="solid"
            name="triangle-exclamation"
            className="size-4 text-amber-500 mt-0.5 shrink-0"
          />
          <div className="text-xs text-amber-800 space-y-0.5">
            {detail.hasOpenAppraisal ? (
              <>
                <p className="font-medium">{t('detail.banner.inProgressTitle')}</p>
                {detail.openAppraisalNumber != null && (
                  <p>
                    {t('detail.banner.appraisalLabel')} <strong>{detail.openAppraisalNumber}</strong>
                    {detail.openAppraisalGroupTag != null && (
                      <>
                        {' '}
                        &middot; {t('detail.banner.groupLabel')}{' '}
                        <strong>{detail.openAppraisalGroupTag}</strong>
                      </>
                    )}
                  </p>
                )}
              </>
            ) : (
              <p>{t('detail.banner.consumed')}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Previous Application Report Details ── (header merged into the page header above) */}
      <section className="shrink-0 bg-white rounded-lg border border-gray-200 p-4">
        <dl className="grid grid-cols-3 gap-x-6 gap-y-4">
          {/* Row 1 */}
          <Field
            label={t('columns.oldAppraisalReportNumber')}
            value={detail.oldAppraisalReportNumber}
          />
          <Field
            label={t('columns.reviewType')}
            value={t(`reviewType.${detail.reviewType}`, { defaultValue: detail.reviewType })}
          />
          <Field label={t('columns.status')} value={detail.status} />

          {/* Row 2 */}
          <Field label={t('columns.cifNumber')} value={detail.cifNumber} />
          <Field label={t('detail.fields.collateralId')} value={detail.collateralId} />
          <Field label={t('detail.fields.collateralName')} value={detail.collateralName} />

          {/* Row 3 — Collateral Description (full width) */}
          <div className="col-span-3">
            <dt className="text-xs text-gray-400">{t('detail.fields.collateralDescription')}</dt>
            <dd className="text-xs font-medium text-gray-800 mt-0.5">
              {detail.collateralDescription ?? '-'}
            </dd>
          </div>

          {/* Row 4 — Collateral Address (full width) */}
          <div className="col-span-3">
            <dt className="text-xs text-gray-400">{t('detail.fields.collateralAddress')}</dt>
            <dd className="text-xs font-medium text-gray-800 mt-0.5">
              {detail.collateralAddress ?? '-'}
            </dd>
          </div>

          {/* Row 5 */}
          <Field label={t('detail.fields.carCode')} value={detail.carCode} />
          <Field
            label={t('detail.fields.valuationDate')}
            value={formatLocaleDate(detail.valuationDate, i18n.language)}
          />
          <Field label={t('detail.fields.pastDueDate')} value={formatNumber(detail.pastDueDay)} />

          {/* Row 6 — External Name (full width) */}
          <div className="col-span-3">
            <dt className="text-xs text-gray-400">{t('detail.fields.externalName')}</dt>
            <dd className="text-xs font-medium text-gray-800 mt-0.5">
              {detail.externalValuerName ?? '-'}
            </dd>
          </div>

          {/* Row 7 — Internal Name (full width) */}
          <div className="col-span-3">
            <dt className="text-xs text-gray-400">{t('detail.fields.internalName')}</dt>
            <dd className="text-xs font-medium text-gray-800 mt-0.5">
              {detail.internalValuerName ?? '-'}
            </dd>
          </div>

          {/* Row 8 — AO Code | AO Name (third col empty) */}
          <Field label={t('detail.fields.aoCode')} value={detail.aoCode} />
          <Field label={t('detail.fields.aoName')} value={detail.aoName} />
          <span />

          {/* Row 9 — SLL Status | SLL Description (third col empty) */}
          <Field
            label={t('detail.fields.sllStatus')}
            value={
              detail.sllOver100M === true ? 'Y' : detail.sllOver100M === false ? 'N' : undefined
            }
          />
          <Field label={t('detail.fields.sllDescription')} value={detail.sllDescription} />
          <span />
        </dl>
      </section>

      {/* ── Application Request List (Group Appraisal) ── */}
      <section className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
        <div className="shrink-0 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-gray-700">{t('detail.group.title')}</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">{t('detail.group.subtitle')}</p>
          </div>
          {selectedNearbyTokens.size > 0 && (
            <span className="text-xs text-primary font-medium">
              {t('detail.group.nearbySelected', { count: selectedNearbyTokens.size })}
            </span>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full min-w-max text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2.5 w-8" />
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">
                  {t('detail.group.columns.oldAppraisalNumber')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">
                  {t('detail.group.columns.source')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">
                  {t('columns.customerName')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">
                  {t('columns.appraisalDate')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">
                  {t('columns.distance')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">
                  {t('detail.group.columns.daysSince')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">
                  {t('columns.remainingDay')}
                </th>
                <th className="px-4 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* Main candidate row — always included, non-interactive checkbox */}
              <tr className="bg-primary/3">
                <td className="px-4 py-2.5">
                  <div className="size-4 rounded border-2 border-primary bg-primary flex items-center justify-center">
                    <Icon style="solid" name="check" className="size-2.5 text-white" />
                  </div>
                </td>
                <td className="px-3 py-2 text-xs font-medium text-gray-900 whitespace-nowrap">
                  {detail.oldAppraisalReportNumber}
                  <span className="ml-1.5 text-[10px] text-primary font-medium">
                    {t('detail.group.main')}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700">
                    SIBS
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-gray-600">{detail.customerName ?? '-'}</td>
                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                  {formatLocaleDate(detail.appraisalDate, i18n.language)}
                </td>
                <td className="px-3 py-2 text-xs text-gray-400 whitespace-nowrap">—</td>
                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                  {formatDateDiff(detail.appraisalDate, TODAY_ISO, durationLabels)}
                </td>
                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                  {/* Main row only: countdown to the AS400-supplied EffectiveDateAppraisal. */}
                  {formatDateDiff(TODAY_ISO, detail.effectiveDateAppraisal, durationLabels)}
                </td>
                <td className="px-3 py-2 w-8">
                  <button
                    onClick={() => setDeleteTarget(detail.id)}
                    className="invisible group-hover:visible flex items-center justify-center size-6 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                    title={t('detail.group.deleteCandidate')}
                  >
                    <Icon style="solid" name="trash" className="size-3" />
                  </button>
                </td>
              </tr>

              {/* Nearby candidates */}
              {detail.nearbyGroupCandidates.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center">
                    <p className="text-xs text-gray-400">{t('detail.group.empty')}</p>
                  </td>
                </tr>
              ) : (
                detail.nearbyGroupCandidates.map((c: NearbyReappraisalCandidate) => {
                  const token = rowToken(c);
                  const checked = selectedNearbyTokens.has(token);
                  // Delete is only possible when a candidateId exists (InSystem-only rows can't be soft-deleted)
                  const canDelete = c.candidateId != null;
                  return (
                    <tr
                      key={token}
                      className={`group transition-colors ${checked ? 'bg-primary/3' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => toggleNearby(token)}
                          className={`size-4 rounded border-2 flex items-center justify-center transition-colors ${
                            checked
                              ? 'border-primary bg-primary'
                              : 'border-gray-300 bg-white hover:border-primary/60'
                          }`}
                          aria-label={
                            checked ? t('detail.group.deselect') : t('detail.group.select')
                          }
                        >
                          {checked && (
                            <Icon style="solid" name="check" className="size-2.5 text-white" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-xs font-medium text-gray-900 whitespace-nowrap">
                        {c.oldAppraisalReportNumber}
                      </td>
                      <td className="px-3 py-2">
                        <SourceBadge source={c.source} />
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">{c.customerName ?? '-'}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                        {formatLocaleDate(c.appraisalDate, i18n.language)}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 tabular-nums whitespace-nowrap">
                        {c.distanceKm != null ? c.distanceKm.toFixed(2) : '-'}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                        {formatDateDiff(c.appraisalDate, TODAY_ISO, durationLabels)}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                        {formatDateDiff(TODAY_ISO, addYearsISO(c.appraisalDate, 5), durationLabels)}
                      </td>
                      <td className="px-3 py-2 w-8">
                        {canDelete ? (
                          <button
                            onClick={() => setDeleteTarget(c.candidateId!)}
                            className="opacity-0 group-hover:opacity-100 flex items-center justify-center size-6 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                            title={t('detail.group.deleteCandidate')}
                          >
                            <Icon style="solid" name="trash" className="size-3" />
                          </button>
                        ) : (
                          // InSystem rows cannot be deleted — render a disabled placeholder
                          <button
                            disabled
                            className="opacity-0 flex items-center justify-center size-6 rounded text-gray-200 cursor-not-allowed"
                            title={t('detail.group.cannotDelete')}
                          >
                            <Icon style="solid" name="trash" className="size-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: initiate button info */}
        <div className="shrink-0 px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {t('detail.group.footer', { count: totalSelected })}
          </span>
        </div>
      </section>

      {/* ── Modals ── */}
      <InitiateConfirmModal
        open={initiateConfirmOpen}
        isPending={initiateMutation.isPending}
        selectedCount={totalSelected}
        onConfirm={handleInitiateConfirm}
        onClose={() => setInitiateConfirmOpen(false)}
      />

      {successResult && (
        <InitiateSuccessModal
          open={successModalOpen}
          groupNumber={successResult.groupNumber}
          createdCount={successResult.createdCount}
          skipped={successResult.skipped}
          onClose={() => {
            setSuccessModalOpen(false);
            navigate('/reappraisal');
          }}
        />
      )}

      <DeleteConfirmModal
        open={!!deleteTarget}
        isPending={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />

      {/* ── Map drawer: pins the main appraisal + nearby group candidates ── */}
      {detail.latitude != null && detail.longitude != null && (
        <HistorySearchMapDrawer
          isOpen={mapOpen}
          onClose={() => setMapOpen(false)}
          initialCenter={{ lat: detail.latitude, lon: detail.longitude }}
          initialRadiusKm={1}
          appraisingCollateralPins={groupPins}
          primaryAppraisalNumber={detail.oldAppraisalReportNumber}
          defaultExpanded
        />
      )}
    </div>
  );
}

export default ReappraisalDetailPage;
