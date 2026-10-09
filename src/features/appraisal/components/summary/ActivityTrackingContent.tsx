import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import Badge from '@/shared/components/Badge';
import { useGetWorkflowProgress } from '@/features/appraisal/api/workflow';
import { useGetAppraisalById } from '@/features/appraisal/api/appraisal';
import { useGetRequestById } from '@/features/request/api/requests';
import { findAddressBySubDistrictCode, findProvinceNameByCode } from '@/shared/data/thaiAddresses';
import ActivityTimeline from '@/features/creditBrief/components/ActivityTimeline';
import { useLocalizedCompanyName } from '@/shared/utils/companyName';
import { useCanOpenAppraisalWorkspace } from '@features/appraisal/hooks/useCanOpenAppraisalWorkspace';
import { useGetAppraisalBrief } from '@/features/creditBrief/api/appraisalBrief';
import DocumentList from '@/features/creditBrief/components/DocumentList';
import CollateralList from '@/features/creditBrief/components/CollateralList';
import { totalArea } from '@/features/creditBrief/sceneModel';
import CollateralScene from '@/features/creditBrief/components/CollateralScene';
import ProjectSummary from '@/features/creditBrief/components/ProjectSummary';
import { teamsChatUrl } from '@/features/creditBrief/teamsChat';
import ProgressSpine from '@/features/creditBrief/components/ProgressSpine';
import { phaseLabel } from '@/features/creditBrief/phaseLabels';
import HolderCard from '@/features/creditBrief/components/HolderCard';

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
};

/** Date only — a due date is a day, and a time of day on it would imply a precision it has not got. */
const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

/**
 * Whole baht, no decimals.
 *
 * These figures run to nine digits, and ".00" on every one of them cost four characters of width
 * to say nothing — appraised values are never quoted to the satang. The unit is rendered beside
 * the number instead, which is what the ".00" was implicitly standing in for.
 */
const formatAmount = (amount: number | null | undefined): string =>
  amount == null ? '—' : Math.round(amount).toLocaleString('en-US');

/**
 * A section marker rather than a container.
 *
 * The panel used to be a stack of bordered, shadowed cards; at full width that reads as a pile of
 * boxes and every heading costs a chrome-heavy strip. Here the heading IS the separator — a small
 * label over a hairline — and the content simply flows underneath.
 *
 * Each section carries an accent, the way the cards' icons used to: with the boxes gone the page
 * needed something other than rules to tell one block from the next as the reader scrolls.
 *
 * The accent is NOT decoration picked per section — it is taken from the colour that section's own
 * content already uses, and a section whose content carries no colour gets the neutral. A violet
 * marker over teal download buttons and amber collateral tiles made one subject look like three,
 * which is exactly the complaint. So: collateral is amber because its rows are, documents are the
 * system teal because their buttons are, and everything else is slate.
 */
const ACCENTS = {
  primary: {
    bar: 'bg-gradient-to-b from-teal-400 to-teal-700',
    text: 'text-teal-700',
    rule: 'from-teal-300/70',
  },
  amber: {
    bar: 'bg-gradient-to-b from-amber-300 to-orange-500',
    text: 'text-amber-700',
    rule: 'from-amber-300/70',
  },
  slate: {
    bar: 'bg-gradient-to-b from-slate-300 to-slate-500',
    text: 'text-slate-600',
    rule: 'from-slate-300/70',
  },
} as const;

const Section = ({
  title,
  accent = 'slate',
  right,
  children,
}: {
  title: string;
  accent?: keyof typeof ACCENTS;
  right?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section>
    <div className="flex items-center justify-between gap-4 pb-2">
      <h3
        className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.09em] ${ACCENTS[accent].text}`}
      >
        <span className={`h-3.5 w-1 rounded-full ${ACCENTS[accent].bar}`} />
        {title}
      </h3>
      {right}
    </div>
    {/* The rule carries the accent too, fading out across the width. A flat grey border under a
        coloured label left the colour stranded on the left edge; this ties the two together and
        gives the eye a direction to read along. */}
    <div className={`h-px bg-gradient-to-r to-transparent ${ACCENTS[accent].rule}`} />
    <div className="pt-4">{children}</div>
  </section>
);

// ── Content ───────────────────────────────────────────────────────────────────

interface ActivityTrackingContentProps {
  appraisalId: string;
}

const ActivityTrackingContent = ({ appraisalId }: ActivityTrackingContentProps) => {
  const { t } = useTranslation(['appraisal', 'common']);
  const localizeCompanyName = useLocalizedCompanyName();
  const canOpenWorkspace = useCanOpenAppraisalWorkspace();
  const location = useLocation();
  const { data, isLoading, isError } = useGetWorkflowProgress(appraisalId);
  const { data: appraisal } = useGetAppraisalById(appraisalId);
  const { data: request } = useGetRequestById(appraisal?.requestId);
  // One call for the money and the documents, and the ONLY place the release rule is applied.
  // Everything money-shaped on it arrives null until the committee approves the price, so this
  // panel never has to re-derive that rule from `status`.
  const {
    data: brief,
    isError: briefFailed,
    error: briefError,
    isPending: briefPending,
  } = useGetAppraisalBrief(appraisalId);

  // A request can name several borrowers; the header shows the first and counts the rest.
  const customerCountLabel =
    brief && brief.customerCount > 1
      ? t(`activityTracking.brief.coBorrowers`, { count: brief.customerCount - 1 })
      : null;

  /**
   * What a block appraisal has instead of an item count. `unitForSaleCount` is
   * the appraiser's declaration and is unset on every horizontal project on the
   * dev database; `unitCount` is what was actually uploaded. Falling back means
   * the header stops reading as "no collateral" for those.
   */
  const projectUnits = brief?.project
    ? (brief.project.unitForSaleCount ?? brief.project.unitCount)
    : 0;

  const briefStatus = (briefError as { response?: { status?: number } } | null)?.response?.status;

  /**
   * Three different failures, three different sentences.
   *
   * 403 is the only one that is about the reader: they hold neither APPRAISAL_VIEW nor
   * APPRAISAL_TRACKING_VIEW and reached the panel by URL. 404 means the appraisal is not there —
   * a wrong id, or one that was soft-deleted. The brief has NO company row scope (it was removed
   * after four attempts locked out entitled firms), so a 404 can no longer mean "not yours", and
   * telling a credit officer they lack access sends them to raise a permissions ticket for what is
   * really a missing record. Anything else is a fault on our side and says so.
   */
  const briefDenied = briefStatus === 403;
  const briefMissing = briefStatus === 404;

  // Cancelled is not the same as "not yet": one is waiting, the other never will be, and the
  // two must not wear the same amber.
  const isCancelled = brief?.status === 'Cancelled';

  /**
   * Past its due date and still not finished. Only past/not-past, not the appraisal side's own
   * verdict ("AtRisk" under two days, "Breached") — this panel shows the commitment, not the
   * scorecard.
   *
   * That is a presentation choice, NOT a guarantee: since the masking was reduced to the value
   * release rule alone, `slaStatus` and `slaDueDate` do reach a tracking-only caller on
   * GET /appraisals. An earlier version of this comment claimed they were masked server-side;
   * they are not, and nothing here should be built on that.
   */
  const isOverdue =
    !!brief?.dueDate &&
    !brief.completedAt &&
    // Cancelled work cannot breach: it was closed, and nobody owes it any more. `completedAt`
    // alone does not cover this — Appraisal.Cancel() stamps CancelledAt and leaves CompletedAt
    // null — so a cancelled appraisal past its date was showing a red overdue chip directly under
    // the banner saying the request had been cancelled.
    !isCancelled &&
    new Date(brief.dueDate).getTime() < Date.now();

  // The phase the rail is pointing at, named the way the rail names it. Taken from the same
  // `steps` the spine renders so the callout and the rail can never disagree.
  const currentStep = data?.steps?.find(s => s.status === 'Current') ?? null;
  const currentStepLabel = phaseLabel(t, currentStep?.group);

  /**
   * Every square wa on the application, whatever kind of collateral carries it.
   *
   * Per-group totals answer "how much land is in THIS group", which is not the
   * question a credit officer is asking — land arrives under several types at
   * once (a bare parcel, a parcel with a building on it, a leasehold) and what
   * matters is the site as a whole. Shown beside the item count so the two
   * headline facts about the security sit together.
   */
  const applicationArea = useMemo(() => {
    const fromAssets = totalArea(brief?.assets ?? []);
    if (fromAssets) return fromAssets;
    // A block appraisal has no assets at all, so its land lives on the project.
    // Without this the header showed no area for an entire class of appraisal.
    const p = brief?.project;
    return p
      ? totalArea([
          {
            areaRai: p.landAreaRai,
            areaNgan: p.landAreaNgan,
            areaSquareWa: p.landAreaSquareWa,
          } as (typeof brief.assets)[number],
        ])
      : null;
    // `brief` as a whole: the callback reads two of its fields and the object is
    // replaced wholesale by the query, so narrowing the deps buys nothing.
  }, [brief]);

  // Nobody to chase once it is closed. Said plainly rather than by leaving the block empty.
  const closedReason = brief?.currentHolder
    ? null
    : brief?.status === 'Cancelled'
      ? t('activityTracking.brief.holder.closedCancelled')
      : brief?.completedAt
        ? t('activityTracking.brief.holder.closedCompleted')
        : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="spinner" style="solid" className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Icon name="triangle-exclamation" style="solid" className="w-10 h-10 text-red-400" />
        <p className="text-sm text-gray-500">{t('common:status.failedToLoad')}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Icon name="diagram-project" style="regular" className="w-10 h-10 text-gray-300" />
        <p className="text-sm text-gray-500">{t('activityTracking.empty')}</p>
      </div>
    );
  }

  const customer = request?.customers?.[0];
  const appointment = request?.detail?.appointment;
  const address = request?.detail?.address;
  // subDistrict / district / province are stored as geocodes — resolve them to Thai names
  // via the shared address store (same lookup the request forms use), falling back to the
  // raw code when the store has no match.
  const geo = address?.subDistrict ? findAddressBySubDistrictCode(address.subDistrict) : undefined;
  const provinceName =
    geo?.provinceName ??
    (address?.province ? findProvinceNameByCode(address.province) : undefined) ??
    address?.province;

  const locationParts = [
    address?.houseNumber,
    address?.projectName,
    address?.moo && `Moo ${address.moo}`,
    address?.soi && `Soi ${address.soi}`,
    address?.road && `${address.road} Road`,
    geo?.subDistrictName ?? address?.subDistrict,
    geo?.districtName ?? address?.district,
    provinceName,
    address?.postcode,
  ].filter(Boolean);
  const locationDisplay = locationParts.length > 0 ? locationParts.join(', ') : null;

  // Appraiser is resolved server-side: external → company + internal follow-up staff;
  // internal → the internal assignee. companyName is null for internal assignments.
  // `companyNameLocal` isn't declared on the generated GetAppraisalByIdResponseType yet
  // (v1.ts regenerates from the backend OpenAPI spec) — read it defensively so this
  // localizes as soon as the backend ships it, without waiting on a client regen.
  const companyNameLocal = (appraisal as { companyNameLocal?: string | null } | undefined)
    ?.companyNameLocal;
  const appraiserDisplay = appraisal?.companyName
    ? [localizeCompanyName(appraisal.companyName, companyNameLocal), appraisal.appraiserName]
        .filter(Boolean)
        .join(' — ')
    : (appraisal?.appraiserName ?? null);

  const flowType = data.routeType;

  return (
    /* Two columns at full width: the phase rail is a spine that stays put on the left while the
       detail scrolls, so "where is this and who has it" reads at any scroll position. One column
       below lg, where a sticky rail would eat most of the screen. */
    <div className="grid items-start gap-x-12 gap-y-8 px-1 pb-10 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="rounded-xl bg-gray-50/70 p-4 lg:sticky lg:top-2">
        {/* Who has it, at the top of the rail: the first thing a credit officer opens this panel
            to find out, and the one they act on. The phase list below is the supporting detail. */}
        <HolderCard
          pending={briefPending}
          holder={brief?.currentHolder}
          stepLabel={currentStepLabel}
          closedReason={closedReason}
          meeting={brief?.meeting}
          isApproval={currentStep?.group === 'Approval'}
          approvedByCommittee={brief?.approvedByCommittee}
          externalCompany={brief?.externalCompany}
        />

        <h3 className="mt-6 flex items-center gap-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.09em] text-teal-700">
          <span className="h-3.5 w-1 rounded-full bg-gradient-to-b from-teal-400 to-teal-700" />
          {t('activityTracking.sections.progress')}
        </h3>
        <div className="h-px bg-gradient-to-r from-teal-300/70 to-transparent" />
        <div className="pt-5">
          <ProgressSpine
            steps={data.steps}
            activityLog={data.activityLog}
            meeting={brief?.meeting}
            approvedByCommittee={brief?.approvedByCommittee}
            externalCompany={brief?.externalCompany}
          />

          {/* "Where is it" is only half the question — "when is it due" is the other half, and it
              belongs here next to the rail rather than buried among the request fields. Once the
              work is finished the target stops mattering, so the actual date replaces it. */}
          <dl className="mt-5 space-y-3 border-t border-gray-100 pt-3">
            {brief?.completedAt ? (
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-gray-400">
                  {t('activityTracking.brief.completedOn')}
                </dt>
                <dd className="text-sm font-semibold text-gray-900">
                  {formatDate(brief.completedAt)}
                </dd>
              </div>
            ) : (
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-gray-400">
                  {t('activityTracking.brief.dueDate')}
                  <span title={t('activityTracking.brief.dueDateHint')}>
                    <Icon
                      name="circle-info"
                      style="regular"
                      className="ml-1 inline h-3 w-3 cursor-help align-[-1px] text-gray-300"
                    />
                  </span>
                </dt>
                <dd
                  className={`text-sm font-semibold ${isOverdue ? 'text-error' : 'text-gray-900'}`}
                >
                  {formatDate(brief?.dueDate)}
                  {isOverdue && (
                    <span className="ml-1.5 text-[11px] font-normal">
                      {t('activityTracking.brief.overdue')}
                    </span>
                  )}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-gray-400">
                {t('activityTracking.sections.route')}
              </dt>
              <dd className="text-sm font-medium text-gray-700">{flowType}</dd>
            </div>
          </dl>

          {/* The appraisal department's own desk — who to ring when the current holder is not the
              right person to ask, or when the work is sitting with a committee. The same contacts
              on every appraisal, so it lives at the foot of the rail rather than in the card. */}
          {!!brief?.appraisalAdmins?.length && (
            <div className="mt-5 border-t border-gray-100 pt-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-400">
                {t(`${'activityTracking.brief.holder.appraisalDesk'}`)}
              </p>
              <ul className="mt-1.5 flex flex-col gap-2">
                {brief.appraisalAdmins.map(admin => (
                  <li
                    // The login is the only unique thing on this row: name and email can both
                    // repeat, and two desk members with neither produced one duplicate key.
                    key={admin.userName ?? `${admin.name}-${admin.email}`}
                    className="min-w-0"
                  >
                    {/* The login in brackets after the name: credit asks the desk for people by
                        bank code as often as by name, and two staff can share a display name. */}
                    {/* The code stands in for the name when there is none: BriefContact.Name is
                        NULLIF-collapsed, so it is null whenever FirstName and LastName are both
                        blank — the LDAP case HolderCard guards the same way — and the row was
                        rendering as an empty space followed by a grey parenthetical. */}
                    <p className="truncate text-xs font-medium text-gray-700">
                      {admin.name ?? admin.userName}
                      {admin.name && admin.userName && (
                        <span className="font-normal text-gray-400"> ({admin.userName})</span>
                      )}
                    </p>
                    {admin.department && (
                      <p className="truncate text-[11px] text-gray-400">{admin.department}</p>
                    )}
                    <div className="mt-0.5 flex flex-col gap-0.5">
                      {admin.phoneNumber && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-500">
                          <Icon
                            name="phone"
                            style="solid"
                            className="h-2.5 w-2.5 flex-none text-gray-400"
                          />
                          <span className="truncate">{admin.phoneNumber}</span>
                        </span>
                      )}
                      {admin.email && (
                        <>
                          <a
                            href={`mailto:${admin.email}`}
                            className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-primary hover:underline"
                          >
                            <Icon
                              name="envelope"
                              style="solid"
                              className="h-2.5 w-2.5 flex-none text-gray-400"
                            />
                            <span className="truncate">{admin.email}</span>
                          </a>
                          {/* Same deep link as the holder card, and the same caveat: it resolves
                              the chat by the AD `mail` address, which works while the tenant's UPN
                              matches it. These are bank staff, so the link always applies here. */}
                          <a
                            href={teamsChatUrl(admin.email)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-500 hover:text-primary hover:underline"
                          >
                            <Icon
                              name="comments"
                              style="solid"
                              className="h-2.5 w-2.5 flex-none text-gray-400"
                            />
                            <span>{t(`${'activityTracking.brief.holder.teamsChat'}`)}</span>
                          </a>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-col gap-9">
        {/* Headline — the three figures a reader opens this panel to check, at a size they can
            be read at, rather than buried as rows 4, 6 and 8 of a ten-row table. */}
        {/* A tinted band rather than another hairline. Dropping the cards left the whole panel on
            plain white, and the one block that should anchor the page — customer, number, the
            three figures — read as just more body text. The tint is the system teal at very low
            opacity, so it groups the headline without becoming a card again. */}
        {/* The identity strip and the three figures.
            Rebuilt from a two-column "name on the left, numbers on the right" row, which at full
            panel width left a metre of empty tint between them and gave all three numbers the same
            weight. Now: one stacked block, the numbers laid out as an even grid across the full
            width so nothing hugs an edge, and the appraised value given the size and the colour
            because it is the figure the whole panel exists to deliver. */}
        {/* Flat, like every other block on this panel.
            It had been the one card on a page of hairline-ruled sections, which made it read as
            a widget dropped onto the page rather than its opening. No ring, no shadow, no filled
            cells: the name is large, the figures are large, and a gradient rule — the same device
            the section markers use — separates them. Weight does the work that a border was
            doing. */}
        <header>
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <div className="min-w-0">
              {/* Number and status identify the record; the customer names it. */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold tabular-nums text-gray-500">
                  {appraisal?.appraisalNumber || '—'}
                </span>
                {/* The brief's status wins. `appraisal` comes from GetAppraisalById, which reads
                    vw_AppraisalDetail.Status — a derived CASE over CompletedAt and the current
                    activity id — while every lock decision on this panel reads the stored column
                    through the brief. Two sources for one fact put an "InProgress" badge over a
                    "cancelled" headline on an appraisal with a lingering pending task. */}
                {(brief?.status ?? appraisal?.status) && (
                  <Badge type="status" value={(brief?.status ?? appraisal?.status)!} size="sm">
                    {t(`list.status.${brief?.status ?? appraisal?.status}`, {
                      defaultValue: (brief?.status ?? appraisal?.status)!,
                    })}
                  </Badge>
                )}
              </div>
              <h2 className="mt-1.5 truncate text-[27px] font-bold leading-tight tracking-tight text-gray-900">
                {customer?.name || '—'}
              </h2>
              {customerCountLabel && (
                <p className="mt-0.5 text-xs text-gray-500">{customerCountLabel}</p>
              )}
            </div>

            {canOpenWorkspace && (
              /* The way into the appraisal workspace. Hidden outright without the permission
                 rather than shown and then bounced — the route guard would redirect to '/', so
                 offering it would only be a dead end. */
              <Link
                to={`/appraisals/${appraisalId}`}
                state={{ returnPath: location.pathname + location.search }}
                /* A link, deliberately — not a filled button. This panel has no other controls,
                   so a solid button read as the page's primary action when it is really just a
                   way out to another screen. Noticeable through size, the accent colour and the
                   outbound arrow rather than through a rule or a fill. */
                className="inline-flex flex-none items-center gap-2 text-sm font-semibold text-primary transition hover:text-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {t('common:actions.viewDetails')}
                <Icon name="arrow-up-right-from-square" style="solid" className="h-3 w-3" />
              </Link>
            )}
          </div>

          <div className="mt-4 h-px bg-gradient-to-r from-teal-400/70 via-gray-200 to-transparent" />

          {/* Three shapes, because the panel has three states and they are not the same question.

              RELEASED: the three figures, spaced not boxed, the appraised value carrying the
              accent and the size.

              LOCKED: one line, not three columns of "—". Most appraisals a credit officer opens
              are still in progress, so the empty shape is the one they see most: two thirds of
              the row spent on dashes, with a small amber chip that read as an error rather than
              as a normal stage of the work.

              NO BRIEF: neither. Without the brief this component knows nothing about the price,
              and `brief?.isReleased` being falsy is absence, not a verdict — falling through to
              LOCKED made the panel assert "the committee has not approved the price yet" about an
              appraisal whose own status badge, which comes from a different call, could be reading
              "Completed" two lines above. The strip below says what actually happened. */}
          {brief &&
            (brief.isReleased ? (
              <dl className="mt-4 flex flex-wrap gap-x-14 gap-y-5">
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    {t('activityTracking.brief.appraisedValue')}
                  </dt>
                  <dd className="mt-1 flex items-baseline gap-1.5">
                    {/* Same size as the other two. Rank is carried by colour and weight alone —
                      at three figures side by side, a size step as well made the row look
                      unaligned rather than ordered. */}
                    <span className="text-2xl font-bold leading-none tabular-nums tracking-tight text-primary">
                      {formatAmount(brief.appraisalValue)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {t('activityTracking.brief.baht')}
                    </span>
                  </dd>
                </div>

                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    {t('activityTracking.brief.forcedSaleValue')}
                  </dt>
                  <dd className="mt-1 flex items-baseline gap-1.5">
                    {brief.forcedSaleValue != null ? (
                      <>
                        <span className="text-2xl font-semibold leading-none tabular-nums tracking-tight text-gray-800">
                          {formatAmount(brief.forcedSaleValue)}
                        </span>
                        <span className="text-xs text-gray-400">
                          {t('activityTracking.brief.baht')}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-gray-300">—</span>
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    {t('activityTracking.brief.insuranceValue')}
                  </dt>
                  <dd className="mt-1 flex items-baseline gap-1.5">
                    {brief.insuranceValue != null ? (
                      <>
                        <span className="text-2xl font-semibold leading-none tabular-nums tracking-tight text-gray-800">
                          {formatAmount(brief.insuranceValue)}
                        </span>
                        <span className="text-xs text-gray-400">
                          {t('activityTracking.brief.baht')}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-gray-300">—</span>
                    )}
                  </dd>
                </div>
              </dl>
            ) : (
              <div className="mt-4 flex items-start gap-2.5">
                <Icon
                  name={isCancelled ? 'ban' : 'lock'}
                  style="solid"
                  className={`mt-0.5 h-4 w-4 flex-none ${
                    isCancelled ? 'text-gray-400' : 'text-amber-500'
                  }`}
                />
                <div className="min-w-0">
                  <b
                    className={`block text-sm font-semibold ${
                      isCancelled ? 'text-gray-600' : 'text-amber-800'
                    }`}
                  >
                    {t(
                      isCancelled
                        ? 'activityTracking.brief.cancelledTitle'
                        : 'activityTracking.brief.lockedTitle',
                    )}
                  </b>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {t(
                      isCancelled
                        ? 'activityTracking.brief.cancelledHint'
                        : 'activityTracking.brief.lockedHint',
                    )}
                  </p>
                </div>
              </div>
            ))}
        </header>

        {/* The brief failed; the workflow data did not. Shown as a strip inside the panel rather
            than as an early return that replaced everything — the phase rail and the activity
            timeline come from a different call and are still correct, and a credit officer chasing
            an appraisal should not lose them to a blip on one of three requests. */}
        {briefFailed && (
          <div
            className={`flex items-start gap-2.5 rounded-lg px-3 py-2.5 ring-1 ${
              briefDenied || briefMissing
                ? 'bg-gray-50 ring-gray-200'
                : 'bg-amber-50/60 ring-amber-200'
            }`}
          >
            <Icon
              name={
                briefDenied ? 'lock' : briefMissing ? 'circle-question' : 'triangle-exclamation'
              }
              style="solid"
              className={`mt-0.5 h-4 w-4 flex-none ${
                briefDenied || briefMissing ? 'text-gray-400' : 'text-amber-500'
              }`}
            />
            <div className="min-w-0">
              <b className="block text-sm font-semibold text-gray-800">
                {t(
                  briefDenied
                    ? 'activityTracking.brief.noAccessTitle'
                    : briefMissing
                      ? 'activityTracking.brief.notFoundTitle'
                      : 'activityTracking.brief.loadFailedTitle',
                )}
              </b>
              <p className="mt-0.5 text-xs text-gray-500">
                {t(
                  briefDenied
                    ? 'activityTracking.brief.noAccessHint'
                    : briefMissing
                      ? 'activityTracking.brief.notFoundHint'
                      : 'activityTracking.brief.loadFailedHint',
                )}
              </p>
            </div>
          </div>
        )}

        <Section title={t('activityTracking.sections.request')} accent="slate">
          <dl className="grid grid-cols-1 gap-x-10 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
            {(
              [
                [
                  t('activityTracking.brief.fields.prevAppraisalNumber'),
                  request?.detail?.prevAppraisalNumber,
                ],
                /* Here, not in the headline row with the three valuation figures: those are
                   outputs of the appraisal and stay withheld until the committee approves, while
                   this is a fact about the REQUEST that credit supplied and can always see.
                   Placing it beside them would imply it was released with them. */
                [
                  t('activityTracking.brief.fields.loanLimit'),
                  brief?.facilityLimit != null
                    ? `${formatAmount(brief.facilityLimit)} ${t('activityTracking.brief.baht')}`
                    : null,
                ],
                [
                  t('activityTracking.brief.fields.appointment'),
                  formatDateTime(appointment?.appointmentDateTime),
                ],
                [t('activityTracking.brief.fields.appraiser'), appraiserDisplay],
                [t('activityTracking.brief.fields.propertyLocation'), locationDisplay],
              ] as [string, React.ReactNode][]
            ).map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-[11px] uppercase tracking-wide text-gray-400">{label}</dt>
                <dd className="mt-0.5 text-sm text-gray-900">
                  {value || <span className="text-gray-300">—</span>}
                </dd>
              </div>
            ))}
          </dl>
        </Section>

        {/* What the appraisal is actually about. The brief endpoint has always returned these;
            the panel simply never showed them, so a reader could follow the work without ever
            seeing which collateral it was for. No per-item value: pricing hangs off a property
            group, not a property. */}
        {brief && (
          <Section
            title={t('activityTracking.sections.collateral')}
            accent="amber"
            right={
              brief.assets.length > 0 ? (
                <span className="text-xs text-gray-400">
                  {t('activityTracking.sections.itemsCount', { count: brief.assets.length })}
                  {applicationArea && (
                    <>
                      {' · '}
                      {t('activityTracking.brief.collateral.totalArea', {
                        area: [
                          `${applicationArea.rai} ${t('activityTracking.brief.collateral.rai')}`,
                          `${applicationArea.ngan} ${t('activityTracking.brief.collateral.ngan')}`,
                          `${applicationArea.wa} ${t('activityTracking.brief.collateral.wa')}`,
                        ].join(' '),
                      })}
                    </>
                  )}
                </span>
              ) : projectUnits ? (
                <span className="text-xs text-gray-400">
                  {t(
                    brief.project && brief.project.towerCount > 0
                      ? 'activityTracking.brief.collateral.unitsOrHouses_unit'
                      : 'activityTracking.brief.collateral.unitsOrHouses_house',
                    { count: projectUnits },
                  )}
                  {applicationArea && (
                    <>
                      {' · '}
                      {t('activityTracking.brief.collateral.totalArea', {
                        area: [
                          `${applicationArea.rai} ${t('activityTracking.brief.collateral.rai')}`,
                          `${applicationArea.ngan} ${t('activityTracking.brief.collateral.ngan')}`,
                          `${applicationArea.wa} ${t('activityTracking.brief.collateral.wa')}`,
                        ].join(' '),
                      })}
                    </>
                  )}
                </span>
              ) : undefined
            }
          >
            {/* A block appraisal has NO assets by design — its collateral is the
                project — so the empty state has to consider both, or an entire
                class of appraisal reads as having no security at all. */}
            {brief.assets.length === 0 && !brief.project ? (
              <p className="text-sm text-gray-400">{t('activityTracking.sections.noCollateral')}</p>
            ) : (
              <>
                {/* The shape of the site above the itemisation: a reader sees one
                    parcel with a house on it, or a plant with twenty-eight
                    machines, before reading a word. Renders nothing when the
                    application holds only kinds it cannot draw. */}
                <CollateralScene assets={brief.assets} project={brief.project} />
                {brief.assets.length > 0 && <CollateralList assets={brief.assets} />}
                {brief.project && <ProjectSummary project={brief.project} />}
              </>
            )}
          </Section>
        )}

        {brief && (
          <Section title={t('activityTracking.sections.documents')} accent="primary">
            <DocumentList
              documents={brief.documents}
              released={brief.documentsReleased}
              lockedReason={t(
                brief.status === 'Cancelled'
                  ? 'activityTracking.brief.documents.lockedCancelled'
                  : 'activityTracking.brief.documents.lockedPending',
              )}
            />
          </Section>
        )}

        <Section title={t('activityTracking.sections.log')} accent="slate">
          <ActivityTimeline activityLog={data.activityLog} />
        </Section>
      </div>
    </div>
  );
};

export default ActivityTrackingContent;
