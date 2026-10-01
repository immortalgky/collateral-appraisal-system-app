import { useMemo, useState, type ReactNode } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import Modal from '@/shared/components/Modal';
import GoogleMapPinIcon from '@/shared/components/GoogleMapPinIcon';
import { HistorySearchMapDrawer } from '@/features/common/historySearch/HistorySearchMapDrawer';
import type { AppraisalPinDto } from '@/features/common/historySearch/types';
import {
  useReappraisalCandidateDetail,
  useInitiateReappraisal,
  useDeleteReappraisalCandidate,
  useRestoreReappraisalCandidate,
} from '../api/reappraisal';
import { PriorSourceBadge, ReappraisalStatusBadge } from '../components/ReappraisalBadges';
import { DueCell, NewAppraisalStatusChip, ReviewTypeChip } from '../components/ReappraisalCells';
import { URGENCY_TEXT, useRemainingText } from '../utils/dueText';
import { diffYMD, dueOf, formatDay, parseDay, startOfToday, urgencyOf } from '../utils/due';
import type {
  InitiateReappraisalResult,
  BlockUnitInfo,
  NearbyReappraisalCandidate,
  SkippedReappraisalItem,
} from '../types';
import { useAuthStore } from '@/features/auth/store';
import { useBreadcrumb } from '@shared/hooks/useBreadcrumb';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNumber(n?: number): string {
  return n == null ? '—' : n.toLocaleString();
}

/** Stable identity token for a nearby row — matches Initiate partitioning logic. */
function rowToken(c: NearbyReappraisalCandidate): string {
  return (c.appraisalId ?? c.candidateId) as string;
}

const TAG =
  'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap';

/** Why a book is in the group table: AS400 lists it as due, or it is a CAS appraisal brought forward. */
function SourceTag({ row }: { row: NearbyReappraisalCandidate }) {
  const { t } = useTranslation('reappraisal');
  if (row.isInProgress)
    return (
      <span className={clsx(TAG, 'bg-amber-50 text-amber-700 border-amber-200 opacity-70')}>
        {t('badge.inProgress')}
      </span>
    );
  if (row.source === 'Candidate')
    return (
      <span className={clsx(TAG, 'bg-amber-50 text-amber-700 border-amber-200')}>
        {t('detail.source.due')}
      </span>
    );
  return (
    <span className={clsx(TAG, 'bg-sky-50 text-sky-700 border-sky-200')}>
      {t('detail.source.inSystemNotDue')}
    </span>
  );
}

// ─── Label / value list ───────────────────────────────────────────────────────

function FactCard({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="bg-white rounded-lg border border-gray-200 shadow-sm px-4 py-3 min-w-0">
      <h3 className="flex items-baseline justify-between gap-2 mb-2 text-xs font-semibold text-gray-800">
        {title}
        {aside && <span className="text-[11px] font-normal text-gray-400">{aside}</span>}
      </h3>
      <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-xs">
        {children}
      </dl>
    </section>
  );
}

function Fact({ label, children, long }: { label: string; children?: ReactNode; long?: boolean }) {
  return (
    <>
      <dt className="text-gray-500 whitespace-nowrap">{label}</dt>
      <dd className={clsx('text-gray-900 break-words', long ? 'leading-relaxed' : 'font-medium')}>
        {children == null || children === false || children === '' ? '—' : children}
      </dd>
    </>
  );
}

function Stat({
  label,
  value,
  note,
  className,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  className?: string;
}) {
  return (
    <div className="px-4 py-3 border-gray-100 [&:not(:first-child)]:border-l">
      <div className="text-[11px] text-gray-500">{label}</div>
      <div
        className={clsx(
          'mt-0.5 text-[15px] font-semibold tabular-nums whitespace-nowrap',
          className ?? 'text-gray-900',
        )}
      >
        {value}
      </div>
      {note && <div className="mt-px text-[11px] text-gray-400 tabular-nums">{note}</div>}
    </div>
  );
}

function Banner({
  tone,
  title,
  children,
  action,
}: {
  tone: 'amber' | 'violet' | 'rose' | 'gray';
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const style = {
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    violet: 'bg-violet-50 border-violet-200 text-violet-900',
    rose: 'bg-rose-50 border-rose-200 text-rose-900',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
  }[tone];
  return (
    <div
      className={clsx(
        'shrink-0 rounded-lg border px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-2',
        style,
      )}
    >
      <div className="flex-1 min-w-0 text-xs leading-relaxed">
        <p className="font-semibold">{title}</p>
        {children && <p>{children}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Block-project unit ───────────────────────────────────────────────────────

/** The project and the unit this row reviews — the request is filled from these (CAS only). */
function BlockUnitSection({ unit }: { unit?: BlockUnitInfo }) {
  const { t } = useTranslation('reappraisal');
  const found = unit?.matchedUnits === 1;
  const isCondo = unit?.projectType === 'U';
  return (
    <>
      {found ? (
        <Banner tone="gray" title={t('unit.bannerTitle', { number: unit?.projectAppraisalNumber })}>
          {t(`unit.matchedBy.${unit?.matchedBy ?? 'CollateralName'}`)} · {t('unit.ownUnit')}
        </Banner>
      ) : !unit ? (
        // The project itself could not be read (e.g. its appraisal was removed): no matching ran.
        <Banner tone="amber" title={t('unit.projectMissingTitle')}>
          {t('unit.projectMissingBody')}
        </Banner>
      ) : (
        <Banner tone="amber" title={t('unit.notFoundTitle')}>
          {unit.matchedUnits > 1
            ? t('unit.ambiguous', { total: unit.matchedUnits })
            : t('unit.notFoundBody')}
        </Banner>
      )}
      <div className="shrink-0 grid grid-cols-1 md:grid-cols-2 gap-3">
        <FactCard title={t('unit.cardUnit')}>
          {found ? (
            isCondo ? (
              <>
                <Fact label={t('unit.fields.tower')}>{unit?.towerName}</Fact>
                <Fact label={t('unit.fields.floor')}>{unit?.floor}</Fact>
                <Fact label={t('unit.fields.room')}>{unit?.roomNumber}</Fact>
                <Fact label={t('unit.fields.registration')}>{unit?.condoRegistrationNumber}</Fact>
                <Fact label={t('unit.fields.usableArea')}>
                  {unit?.usableArea != null &&
                    t('unit.sqm', { value: formatNumber(unit.usableArea) })}
                </Fact>
                <Fact label={t('unit.fields.model')}>{unit?.modelType}</Fact>
              </>
            ) : (
              <>
                <Fact label={t('unit.fields.house')}>{unit?.houseNumber}</Fact>
                <Fact label={t('unit.fields.plot')}>{unit?.plotNumber}</Fact>
                <Fact label={t('unit.fields.landArea')}>
                  {unit?.landArea != null && t('unit.sqwa', { value: formatNumber(unit.landArea) })}
                </Fact>
                <Fact label={t('unit.fields.usableArea')}>
                  {unit?.usableArea != null &&
                    t('unit.sqm', { value: formatNumber(unit.usableArea) })}
                </Fact>
                <Fact label={t('unit.fields.model')}>{unit?.modelType}</Fact>
              </>
            )
          ) : (
            <Fact label={t('unit.fields.unit')}>{undefined}</Fact>
          )}
          <Fact label={t('unit.fields.unitPrice')}>
            {unit?.unitPrice != null && `${formatNumber(unit.unitPrice)} ${t('detail.stats.baht')}`}
          </Fact>
        </FactCard>
        <FactCard title={t('unit.cardProject')}>
          <Fact label={t('unit.fields.projectName')}>{unit?.projectName}</Fact>
          <Fact label={t('unit.fields.projectType')}>
            {unit?.projectType &&
              t(`unit.projectType.${unit.projectType}`, { defaultValue: unit.projectType })}
          </Fact>
          <Fact label={t('unit.fields.projectAppraisal')}>
            {unit && (
              <Link
                to={`/appraisals/${unit.projectAppraisalId}/360`}
                className="text-primary hover:underline tabular-nums"
              >
                {unit.projectAppraisalNumber}
              </Link>
            )}
          </Fact>
          <Fact label={t('unit.fields.projectValuationDate')}>
            {unit?.projectValuationDate && formatDay(unit.projectValuationDate)}
          </Fact>
        </FactCard>
      </div>
    </>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function ConfirmFooter({
  onClose,
  onConfirm,
  isPending,
  confirmLabel,
}: {
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  confirmLabel: string;
}) {
  const { t } = useTranslation('common');
  return (
    <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
      <Button variant="outline" size="sm" onClick={onClose} disabled={isPending}>
        {t('actions.cancel')}
      </Button>
      <Button variant="primary" size="sm" onClick={onConfirm} isLoading={isPending}>
        {confirmLabel}
      </Button>
    </div>
  );
}

function SkipConfirmModal({
  open,
  isPending,
  onConfirm,
  onClose,
}: {
  open: boolean;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('reappraisal');
  return (
    <Modal isOpen={open} onClose={onClose} title={t('detail.deleteModal.title')} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-700 leading-relaxed">{t('detail.deleteModal.body')}</p>
        <ConfirmFooter
          onClose={onClose}
          onConfirm={onConfirm}
          isPending={isPending}
          confirmLabel={t('detail.deleteModal.confirm')}
        />
      </div>
    </Modal>
  );
}

/** One line per book: what its request will start with. */
function BookList({
  books,
}: {
  books: { bookNumber: string; hasPrior: boolean; tag?: ReactNode; note?: string }[];
}) {
  const { t } = useTranslation('reappraisal');
  return (
    <ul className="rounded-lg border border-gray-200 divide-y divide-gray-100">
      {books.map(b => (
        <li key={b.bookNumber} className="px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-primary tabular-nums">{b.bookNumber}</span>
            {b.tag}
          </div>
          <p className="mt-0.5 text-[11px] text-gray-500">
            {b.note ??
              (b.hasPrior
                ? t('detail.initiateModal.copiesPrior')
                : t('detail.initiateModal.startsEmpty'))}
          </p>
        </li>
      ))}
    </ul>
  );
}

function InitiateConfirmModal({
  open,
  isPending,
  books,
  onConfirm,
  onClose,
}: {
  open: boolean;
  isPending: boolean;
  books: { bookNumber: string; hasPrior: boolean; note?: string }[];
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('reappraisal');
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={t('detail.initiateModal.titleWithCount', { total: books.length })}
      size="md"
    >
      <div className="space-y-4">
        <BookList books={books} />
        <p className="rounded-lg bg-primary/5 border border-primary/15 px-3 py-2 text-xs text-gray-700 leading-relaxed">
          {t('detail.initiateModal.draftNotice')}
        </p>
        <ConfirmFooter
          onClose={onClose}
          onConfirm={onConfirm}
          isPending={isPending}
          confirmLabel={t('detail.initiateModal.confirm', { total: books.length })}
        />
      </div>
    </Modal>
  );
}

const SKIP_REASON_KEY: Record<SkippedReappraisalItem['reason'], string> = {
  AlreadyInFlight: 'detail.successModal.alreadyInFlight',
  AlreadyReviewed: 'detail.successModal.alreadyReviewed',
  NoBookNumber: 'detail.successModal.noBookNumber',
  NotDue: 'detail.successModal.notDue',
};

function InitiateResultModal({
  result,
  onClose,
}: {
  result: InitiateReappraisalResult | null;
  onClose: () => void;
}) {
  const { t } = useTranslation(['reappraisal', 'common']);
  const navigate = useNavigate();
  if (!result) return null;
  const accepted = result.accepted ?? [];
  const createdCount = result.acceptedCount ?? accepted.length;
  const skipped = result.skipped ?? [];
  return (
    <Modal isOpen onClose={onClose} title={t('detail.successModal.title')} size="md">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div
            className={clsx(
              'size-9 shrink-0 rounded-full flex items-center justify-center',
              createdCount > 0 ? 'bg-primary/10' : 'bg-amber-50',
            )}
          >
            <Icon
              style="solid"
              name={createdCount > 0 ? 'check' : 'ban'}
              className={clsx('size-4', createdCount > 0 ? 'text-primary' : 'text-amber-600')}
            />
          </div>
          <div className="text-xs">
            <p className="text-sm font-semibold text-gray-900">
              {t('detail.successModal.createdDrafts', { total: createdCount })}
              {createdCount > 0 && (
                <span className="font-normal text-gray-500">
                  {' · '}
                  {t('detail.successModal.groupNumber')}{' '}
                  <span className="tabular-nums">{result.groupNumber}</span>
                </span>
              )}
            </p>
            {createdCount > 0 && (
              <p className="text-gray-500 mt-0.5">{t('detail.successModal.notSubmitted')}</p>
            )}
          </div>
        </div>

        {accepted.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-gray-600">
              {t('detail.successModal.createdHeading')}
            </p>
            <BookList
              books={accepted.map(a => ({
                bookNumber: a.bookNumber,
                hasPrior: a.prevAppraisalId != null,
                tag: (
                  <span className={clsx(TAG, 'bg-primary/5 text-primary border-primary/20')}>
                    {t('progress.draft')}
                  </span>
                ),
              }))}
            />
          </div>
        )}

        {skipped.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-gray-600">
              {t('detail.successModal.skippedHeading', { total: skipped.length })}
            </p>
            <BookList
              books={skipped.map((s, i) => ({
                bookNumber: s.oldAppraisalReportNumber ?? `—${i}`,
                hasPrior: false,
                tag: (
                  <span className={clsx(TAG, 'bg-amber-50 text-amber-700 border-amber-200')}>
                    {t(SKIP_REASON_KEY[s.reason] as 'detail.successModal.notDue')}
                  </span>
                ),
                note: t(`detail.successModal.reasonHint.${s.reason}`),
              }))}
            />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
          <Button variant="outline" size="sm" onClick={onClose}>
            {t('detail.backToList')}
          </Button>
          {createdCount > 0 && (
            <Button variant="primary" size="sm" onClick={() => navigate('/requests')}>
              {t('detail.successModal.goToRequests')}
            </Button>
          )}
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
  const remaining = useRemainingText();

  const { data: detail, isLoading, isError, error } = useReappraisalCandidateDetail(id ?? '');
  const initiateMutation = useInitiateReappraisal();
  const deleteMutation = useDeleteReappraisalCandidate();
  const restoreMutation = useRestoreReappraisalCandidate();

  // Breadcrumb: Home › Reappraisal (AS400) › <appraisal number>
  useBreadcrumb(detail?.oldAppraisalReportNumber, 'folder-open');

  // Selected nearby rows — keyed by (appraisalId ?? candidateId)
  const [selectedNearbyTokens, setSelectedNearbyTokens] = useState<Set<string>>(new Set());
  const [initiateConfirmOpen, setInitiateConfirmOpen] = useState(false);
  const [result, setResult] = useState<InitiateReappraisalResult | null>(null);
  // The candidate to skip, and the selection token of its row (a nearby row's token is its appraisal
  // id when it has one, so the candidate id alone would leave the row ticked).
  const [skipTarget, setSkipTarget] = useState<{ candidateId: string; token?: string } | null>(
    null,
  );
  const [mapOpen, setMapOpen] = useState(false);

  // Overlay pins for the map drawer: the main appraisal + every nearby group candidate that has
  // coordinates. SIBS rows not yet geo-enriched (null lat/lon) are simply absent from the map.
  const groupPins = useMemo<AppraisalPinDto[]>(() => {
    if (!detail || detail.latitude == null || detail.longitude == null) return [];
    const pin = (
      appraisalId: string | undefined,
      appraisalNumber: string,
      lat: number,
      lon: number,
      appraisedDate: string | undefined,
      distanceKm: number | null,
      customerName: string | undefined,
    ): AppraisalPinDto => ({
      // Real in-system appraisal id only (empty when AS400-only) — never the candidate id: the pin
      // drawer fetches appraisal data with it.
      appraisalId: appraisalId ?? '',
      appraisalNumber,
      lat,
      lon,
      propertyType: null,
      buildingType: null,
      appraisedValue: null,
      appraisedDate: appraisedDate ?? null,
      distanceKm,
      province: null,
      district: null,
      subDistrict: null,
      customerName: customerName ?? null,
    });
    const pins = [
      pin(
        detail.appraisalId,
        detail.oldAppraisalReportNumber,
        detail.latitude,
        detail.longitude,
        detail.appraisalDate,
        0,
        detail.customerName,
      ),
    ];
    for (const c of detail.nearbyGroupCandidates) {
      if (c.latitude == null || c.longitude == null) continue;
      pins.push(
        pin(
          c.appraisalId,
          c.oldAppraisalReportNumber,
          c.latitude,
          c.longitude,
          c.appraisalDate,
          c.distanceKm ?? null,
          c.customerName,
        ),
      );
    }
    return pins;
  }, [detail]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="h-6 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="h-16 bg-gray-100 rounded animate-pulse" />
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded animate-pulse" />
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

  const isBlocked = detail.status !== 'Pending' || detail.hasOpenAppraisal === true;
  const hasCoords = detail.latitude != null && detail.longitude != null;
  const due = dueOf(detail.appraisalDate);
  const age = due ? diffYMD(due.appraised, startOfToday()) : undefined;
  const fd = formatDay;
  const monthYear = (iso?: string) => {
    const d = parseDay(iso);
    return d
      ? d.toLocaleDateString(i18n.language?.startsWith('th') ? 'th-TH' : 'en-GB', {
          month: 'short',
          year: '2-digit',
        })
      : '—';
  };

  const nearby = detail.nearbyGroupCandidates;
  const selectedRows = nearby.filter(c => !c.isInProgress && selectedNearbyTokens.has(rowToken(c)));
  const totalSelected = 1 + selectedRows.length;

  const toggleNearby = (token: string) =>
    setSelectedNearbyTokens(prev => {
      const next = new Set(prev);
      if (next.has(token)) next.delete(token);
      else next.add(token);
      return next;
    });

  const handleInitiateConfirm = () => {
    if (!user) return;
    const candidateIds: string[] = [detail.id];
    const nearbyAppraisalIds: string[] = [];
    for (const row of selectedRows) {
      // A row with a Pending candidate goes by candidate; an in-system-only row by appraisal.
      if (row.candidateId) candidateIds.push(row.candidateId);
      else if (row.appraisalId) nearbyAppraisalIds.push(row.appraisalId);
    }
    // Project convention: Request.Requestor/Creator store the bank user CODE (e.g. "P5229"),
    // which is held in `user.username` on the FE auth model — NOT the Guid `user.id`.
    // `username` field on the wire DTO carries the display name (`user.name`).
    const userInfo = { userId: user.username, username: user.name };
    initiateMutation.mutate(
      { candidateIds, nearbyAppraisalIds, requestor: userInfo, creator: userInfo },
      {
        onSuccess: res => {
          setInitiateConfirmOpen(false);
          setResult(res);
        },
      },
    );
  };

  const handleSkipConfirm = () => {
    if (!skipTarget) return;
    const { candidateId, token } = skipTarget;
    deleteMutation.mutate(candidateId, {
      onSuccess: () => {
        setSkipTarget(null);
        if (candidateId === detail.id) {
          navigate('/reappraisal');
        } else if (token) {
          setSelectedNearbyTokens(prev => {
            const next = new Set(prev);
            next.delete(token);
            return next;
          });
        }
      },
    });
  };

  const openWork = detail.openAppraisalId
    ? { to: `/appraisals/${detail.openAppraisalId}`, label: detail.openAppraisalNumber }
    : detail.openRequestId
      ? { to: `/requests/${detail.openRequestId}`, label: detail.openRequestNumber }
      : undefined;

  const priorFromCas = detail.priorAppraisalSource === 'CAS';
  const yesNo = (v?: string) =>
    v == null || v.trim() === ''
      ? undefined
      : v.trim().toUpperCase() === 'Y'
        ? t('detail.fields.yes')
        : t('detail.fields.no');

  return (
    <div className="flex flex-col min-h-full min-w-0 gap-3">
      {/* ── Page header ── */}
      <div className="shrink-0 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <button
            onClick={() => navigate('/reappraisal')}
            aria-label={t('detail.backToList')}
            className="flex items-center justify-center size-7 shrink-0 rounded-md border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            <Icon style="solid" name="arrow-left" className="size-3.5" />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900 tabular-nums">
                {detail.oldAppraisalReportNumber}
              </h2>
              <ReappraisalStatusBadge
                status={detail.status}
                hasOpenAppraisal={detail.hasOpenAppraisal}
              />
              <PriorSourceBadge source={detail.priorAppraisalSource} />
              {detail.isBlockUnit && (
                <span className={clsx(TAG, 'bg-teal-50 text-teal-700 border-teal-200')}>
                  {t('unit.tag')}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {detail.customerName ?? '—'} · CIF {detail.cifNumber} ·{' '}
              {t(`reviewType.${detail.reviewType}`, { defaultValue: detail.reviewType })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Null-check (not truthy) — valid lat/lon may be 0. */}
          {hasCoords && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMapOpen(true)}
              leftIcon={<GoogleMapPinIcon />}
            >
              {t('actions.viewOnMap')}
            </Button>
          )}
          {!isBlocked && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setSkipTarget({ candidateId: detail.id })}
            >
              {t('detail.group.deleteCandidate')}
            </Button>
          )}
        </div>
      </div>

      {/* ── Banners ── */}
      {detail.status === 'Deleted' ? (
        <Banner
          tone="rose"
          title={t('detail.banner.notReviewingTitle')}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => restoreMutation.mutate(detail.id)}
              isLoading={restoreMutation.isPending}
            >
              {t('actions.restore')}
            </Button>
          }
        >
          {t('detail.banner.notReviewing')}
        </Banner>
      ) : detail.status === 'Consumed' ? (
        <Banner
          tone="gray"
          title={t('detail.banner.processedTitle')}
          action={
            detail.newAppraisalId && (
              <Link
                to={`/appraisals/${detail.newAppraisalId}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 bg-white rounded-lg text-gray-800 hover:bg-gray-100"
              >
                {t('detail.banner.open', { number: detail.newAppraisalNumber })}
                <Icon style="solid" name="arrow-up-right-from-square" className="size-2.5" />
              </Link>
            )
          }
        >
          {detail.newAppraisalId ? (
            <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
              {t('detail.banner.processedAppraisal')}{' '}
              <b className="tabular-nums">{detail.newAppraisalNumber}</b>
              <NewAppraisalStatusChip status={detail.newAppraisalStatus} />
              <span>
                ·{' '}
                {detail.newAppraisalGroupTag
                  ? `${t('detail.banner.groupLabel')} ${detail.newAppraisalGroupTag}`
                  : t('processed.createdByHand')}
              </span>
              <span className="tabular-nums">
                · {t('columns.submittedAt')} {fd(detail.newAppraisalSubmittedAt)}
              </span>
              {detail.newAppraisalStatus === 'Completed' && (
                <span className="tabular-nums">
                  · {t('columns.completedAt')} {fd(detail.newAppraisalCompletedAt)}
                </span>
              )}
            </span>
          ) : (
            t('processed.notFoundHint')
          )}
        </Banner>
      ) : detail.hasOpenAppraisal ? (
        <Banner
          tone="amber"
          title={
            detail.openAppraisalNumber != null
              ? t('detail.banner.inProgressTitle')
              : t('detail.banner.awaitingSubmitTitle')
          }
          action={
            openWork && (
              <Link
                to={openWork.to}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-amber-300 bg-white rounded-lg text-amber-800 hover:bg-amber-100"
              >
                {t('detail.banner.open', { number: openWork.label })}
                <Icon style="solid" name="arrow-up-right-from-square" className="size-2.5" />
              </Link>
            )
          }
        >
          {detail.openAppraisalNumber != null
            ? t('detail.banner.inProgressBody', {
                number: detail.openAppraisalNumber,
                group: detail.openAppraisalGroupTag ?? '—',
              })
            : t('detail.banner.awaitingSubmitBody', { number: detail.openRequestNumber ?? '—' })}
        </Banner>
      ) : !priorFromCas ? (
        <Banner
          tone="violet"
          title={
            detail.priorAppraisalSource === 'AS400Legacy'
              ? t('detail.banner.legacyTitle')
              : t('detail.banner.unknownTitle')
          }
        >
          {t('detail.banner.noPriorRequest')}
        </Banner>
      ) : null}

      {/* ── Block-project unit ── */}
      {detail.isBlockUnit && <BlockUnitSection unit={detail.unit} />}

      {/* ── Due summary ── */}
      <section className="shrink-0 bg-white rounded-lg border border-gray-200 shadow-sm grid grid-cols-2 lg:grid-cols-4">
        <Stat
          label={t('detail.stats.reviewDue')}
          value={due ? remaining(due.due, due.daysLeft) : '—'}
          className={due ? URGENCY_TEXT[urgencyOf(due.daysLeft)] : undefined}
          note={due && t('detail.stats.reviewDueNote', { date: fd(due.due) })}
        />
        <Stat
          label={t('detail.stats.lastAppraisal')}
          value={fd(detail.appraisalDate)}
          note={
            age &&
            t('detail.stats.ago', {
              period: [age.y > 0 ? t('due.years', { n: age.y }) : '', t('due.months', { n: age.m })]
                .filter(Boolean)
                .join(' '),
            })
          }
        />
        <Stat
          label={t('detail.stats.effectiveDate')}
          value={fd(detail.effectiveDateAppraisal)}
          note={t('detail.stats.effectiveDateNote')}
        />
        <Stat
          label={t('detail.stats.priorValue')}
          value={formatNumber(detail.currentValue)}
          note={t('detail.stats.baht')}
        />
      </section>

      {/* ── Facts ── */}
      <div className="shrink-0 grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-3">
        <FactCard
          title={t('detail.cards.collateral')}
          aside={`${t('detail.fields.collateralId')} ${detail.collateralId}`}
        >
          <Fact label={t('detail.fields.name')}>{detail.collateralName}</Fact>
          <Fact label={t('detail.fields.description')} long>
            {detail.collateralDescription}
          </Fact>
          <Fact label={t('detail.fields.address')} long>
            {detail.collateralAddress}
          </Fact>
          <Fact label={t('detail.fields.carCode')}>{detail.carCode}</Fact>
        </FactCard>
        <FactCard
          title={t('detail.cards.prior')}
          aside={t(`detail.priorFrom.${priorFromCas ? 'CAS' : 'AS400'}`)}
        >
          <Fact label={t('columns.oldAppraisalReportNumber')}>
            <span className="tabular-nums">{detail.oldAppraisalReportNumber}</span>
            {detail.appraisalId && (
              <Link
                to={`/appraisals/${detail.appraisalId}/360`}
                className="ml-2 font-normal text-primary hover:underline"
              >
                {t('detail.openPrior')}
              </Link>
            )}
          </Fact>
          <Fact label={t('detail.fields.valuationDate')}>
            {detail.valuationDate && fd(detail.valuationDate)}
          </Fact>
          <Fact label={t('detail.fields.value')}>
            {detail.currentValue != null &&
              `${formatNumber(detail.currentValue)} ${t('detail.stats.baht')}`}
          </Fact>
          <Fact label={t('detail.fields.externalName')}>{detail.externalValuerName}</Fact>
          <Fact label={t('detail.fields.internalName')}>{detail.internalValuerName}</Fact>
        </FactCard>
        <FactCard title={t('detail.cards.loan')}>
          <Fact label={t('detail.fields.mortgageAmount')}>
            {detail.mortgageAmount != null && formatNumber(detail.mortgageAmount)}
          </Fact>
          <Fact label={t('detail.fields.facilityLimit')}>
            {detail.facilityLimit != null && formatNumber(detail.facilityLimit)}
          </Fact>
          <Fact label={t('detail.fields.pastDue')}>
            {detail.pastDueDay != null &&
              t('detail.fields.days', { days: formatNumber(detail.pastDueDay) })}
          </Fact>
          <Fact label="AO">
            {[detail.aoCode, detail.aoName].filter(Boolean).join(' · ') || undefined}
          </Fact>
          <Fact label={t('detail.fields.sllStatus')}>
            {[yesNo(detail.sllOver100M), detail.sllDescription].filter(Boolean).join(' · ') ||
              undefined}
          </Fact>
        </FactCard>
        <FactCard title={t('detail.cards.thisRound')}>
          <Fact label={t('columns.reviewType')}>
            <ReviewTypeChip code={detail.reviewType} />
          </Fact>
          <Fact label="Stage">{detail.stage}</Fact>
          <Fact label={t('detail.fields.group')}>
            {[detail.group, detail.ibgRetail].filter(Boolean).join(' · ') || undefined}
          </Fact>
          <Fact label={t('detail.fields.effectiveDate')}>
            {detail.effectiveDateAppraisal && fd(detail.effectiveDateAppraisal)}
          </Fact>
          <Fact label={t('detail.fields.onFile')}>
            <span className="tabular-nums">
              {monthYear(detail.firstSeenFileDate)} – {monthYear(detail.lastSeenFileDate)}
            </span>
          </Fact>
        </FactCard>
      </div>

      {/* ── Group selection ── */}
      <section className="flex-1 min-h-[20rem] bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
        <div className="shrink-0 px-4 py-3 border-b border-gray-100">
          <h3 className="text-xs font-semibold text-gray-800">{t('detail.group.title')}</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">{t('detail.group.subtitle')}</p>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full min-w-max text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500">
                <th className="px-4 py-2.5 w-8" />
                {[
                  t('detail.group.columns.book'),
                  t('detail.group.columns.source'),
                  t('columns.customerName'),
                  t('columns.distance'),
                  t('columns.lastAppraisal'),
                  t('columns.reviewDue'),
                ].map(label => (
                  <th key={label} className="px-3 py-2.5 text-left font-medium whitespace-nowrap">
                    {label}
                  </th>
                ))}
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* Main book — always included */}
              <tr className="bg-primary/[0.03]">
                <td className="px-4 py-2">
                  <span
                    className="size-4 rounded border-2 border-primary bg-primary flex items-center justify-center"
                    aria-hidden
                  >
                    <Icon style="solid" name="check" className="size-2.5 text-white" />
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className="font-medium text-primary tabular-nums">
                    {detail.oldAppraisalReportNumber}
                  </span>
                  <span className={clsx(TAG, 'ml-1.5 bg-primary/5 text-primary border-primary/20')}>
                    {t('detail.group.thisBook')}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className={clsx(TAG, 'bg-amber-50 text-amber-700 border-amber-200')}>
                    {t('detail.source.due')}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-700">{detail.customerName ?? '—'}</td>
                <td className="px-3 py-2 text-gray-300">—</td>
                <td className="px-3 py-2 text-gray-700 whitespace-nowrap tabular-nums">
                  {fd(detail.appraisalDate)}
                </td>
                <td className="px-3 py-2">
                  <DueCell appraisalDate={detail.appraisalDate} />
                </td>
                <td className="px-3 py-2" />
              </tr>

              {nearby.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-gray-400">
                    {hasCoords ? t('detail.group.empty') : t('detail.group.noCoordinates')}
                  </td>
                </tr>
              ) : (
                nearby.map(c => {
                  const token = rowToken(c);
                  const disabled = isBlocked || !!c.isInProgress;
                  const checked = !disabled && selectedNearbyTokens.has(token);
                  return (
                    <tr
                      key={token}
                      className={clsx(
                        c.isInProgress
                          ? 'text-gray-400'
                          : checked
                            ? 'bg-primary/[0.03]'
                            : 'hover:bg-gray-50',
                      )}
                    >
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleNearby(token)}
                          aria-label={t('detail.group.selectBook', {
                            number: c.oldAppraisalReportNumber,
                          })}
                          className="size-4 rounded border-gray-300 accent-[var(--color-primary-600)] disabled:opacity-40"
                        />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span
                          className={clsx(
                            'font-medium tabular-nums',
                            c.isInProgress ? 'text-gray-400' : 'text-primary',
                          )}
                        >
                          {c.oldAppraisalReportNumber}
                        </span>
                        {c.source === 'Candidate' && !c.appraisalId && (
                          <span
                            className={clsx(
                              TAG,
                              'ml-1.5 bg-violet-50 text-violet-700 border-violet-200',
                            )}
                          >
                            {t('detail.group.notInCas')}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <SourceTag row={c} />
                      </td>
                      <td className="px-3 py-2">{c.customerName ?? '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                        {c.distanceKm != null
                          ? `${c.distanceKm.toFixed(2)} ${t('detail.group.km')}`
                          : '—'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                        {fd(c.appraisalDate)}
                      </td>
                      <td className="px-3 py-2">
                        {c.isInProgress ? '—' : <DueCell appraisalDate={c.appraisalDate} />}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {c.candidateId && !c.isInProgress && (
                          <button
                            type="button"
                            onClick={() =>
                              setSkipTarget({ candidateId: c.candidateId!, token: rowToken(c) })
                            }
                            className="px-2 py-1 text-[11px] text-gray-500 rounded-md border border-transparent hover:border-red-200 hover:bg-red-50 hover:text-red-700 whitespace-nowrap"
                          >
                            {t('detail.group.deleteCandidate')}
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

        {/* Action bar — the selection and the action that uses it, together */}
        <div className="sticky bottom-0 shrink-0 px-4 py-2.5 border-t border-gray-200 bg-gray-50/90 backdrop-blur rounded-b-lg flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-gray-600">
            {isBlocked
              ? detail.status === 'Deleted'
                ? t('detail.actionBar.restoreFirst')
                : detail.status === 'Consumed'
                  ? t('detail.actionBar.processed')
                  : t('detail.actionBar.blocked')
              : t('detail.actionBar.summary', { total: totalSelected, nearby: totalSelected - 1 })}
          </span>
          <Button
            variant="primary"
            size="sm"
            disabled={isBlocked}
            onClick={isBlocked ? undefined : () => setInitiateConfirmOpen(true)}
          >
            {t('actions.initiate')}
            {!isBlocked && (
              <span className="ml-1.5 rounded-full bg-white/25 px-1.5 text-[10px] tabular-nums">
                {totalSelected}
              </span>
            )}
          </Button>
        </div>
      </section>

      {/* ── Modals ── */}
      <InitiateConfirmModal
        open={initiateConfirmOpen}
        isPending={initiateMutation.isPending}
        books={[
          {
            bookNumber: detail.oldAppraisalReportNumber,
            hasPrior: detail.appraisalId != null,
            note: detail.isBlockUnit ? t('detail.initiateModal.fromUnit') : undefined,
          },
          ...selectedRows.map(r => ({
            bookNumber: r.oldAppraisalReportNumber,
            hasPrior: r.appraisalId != null,
          })),
        ]}
        onConfirm={handleInitiateConfirm}
        onClose={() => setInitiateConfirmOpen(false)}
      />

      <InitiateResultModal
        result={result}
        onClose={() => {
          setResult(null);
          navigate('/reappraisal');
        }}
      />

      <SkipConfirmModal
        open={!!skipTarget}
        isPending={deleteMutation.isPending}
        onConfirm={handleSkipConfirm}
        onClose={() => setSkipTarget(null)}
      />

      {hasCoords && (
        <HistorySearchMapDrawer
          isOpen={mapOpen}
          onClose={() => setMapOpen(false)}
          initialCenter={{ lat: detail.latitude!, lon: detail.longitude! }}
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
