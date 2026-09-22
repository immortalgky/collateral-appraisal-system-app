import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import type { TFunction } from 'i18next';
import { useLocalizedCompanyName } from '@/shared/utils/companyName';
import { committeeName } from '../committeeNames';
import { loginCode, poolLabel } from '../assigneeLabels';
import { teamsChatUrl } from '../teamsChat';
import type { BriefExternalCompany, BriefHolder, BriefMeeting } from '../api/appraisalBrief';

/**
 * "Where is it and who do I call" — the question this whole panel exists to answer, so it sits
 * at the top of the rail rather than being left for the reader to work out from the phase list.
 *
 * Email is a `mailto:` link — on a bank laptop that opens Outlook, which is the next action after
 * reading this block. The PHONE is deliberately plain text: the column is free text and half the
 * firms write a range ("0-2951-9003-4") or an extension, neither of which parses into one dialable
 * number, so a tel: link would confidently dial the wrong place.
 */
interface HolderCardProps {
  /** The brief has not answered yet. "Not yet assigned" is a CLAIM about the work, and this card
   *  renders before the brief resolves (the panel's loading gate waits on the workflow query only,
   *  and a failed brief never resolves at all), so it must not make that claim on absence. */
  pending?: boolean;
  holder: BriefHolder | null | undefined;
  /** The phase label from the workflow rail — the step, in the reader's words rather than the activity id. */
  stepLabel: string | null;
  /** Set when the appraisal is closed, and shown instead: there is nobody to chase. */
  closedReason: string | null;
  /** The committee sitting, when the work is at the approval step. */
  meeting?: BriefMeeting | null;
  /** True while the current phase is Approval — then the committee, not a member, is the holder. */
  isApproval?: boolean;
  /** Committee code, when one has been stamped. Names the body in preference to the sitting. */
  approvedByCommittee?: string | null;
  /** The outside firm, when the work went out — its admin is the contact, not the appraiser. */
  externalCompany?: BriefExternalCompany | null;
}

/** A meeting is a date in the diary, not a timestamp — day and month is what a reader needs. */
const meetingDate = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? null
    : d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
};

const heldSinceText = (t: TFunction<'appraisal'>, iso: string | null): string | null => {
  if (!iso) return null;
  const started = new Date(iso).getTime();
  if (isNaN(started)) return null;
  const days = Math.floor((Date.now() - started) / 86_400_000);
  return days <= 0
    ? t('activityTracking.brief.holder.sinceToday')
    : t('activityTracking.brief.holder.heldFor', { count: days });
};

const initials = (name: string) =>
  name
    .replace(/^(นาย|นาง|นางสาว|บริษัท|บจก\.|คณะ)\s*/, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p.charAt(0))
    .join('');

const HolderCard = ({
  pending,
  holder,
  stepLabel,
  closedReason,
  meeting,
  isApproval,
  approvedByCommittee,
  externalCompany,
}: HolderCardProps) => {
  const { t } = useTranslation('appraisal');
  const localizeCompanyName = useLocalizedCompanyName();

  if (closedReason) {
    return (
      <div className="border-l-2 border-gray-200 pl-3">
        <p className="text-[11px] uppercase tracking-[0.09em] text-gray-400">
          {t('activityTracking.brief.holder.statusLabel')}
        </p>
        <p className="mt-1 text-sm text-gray-600">{closedReason}</p>
      </div>
    );
  }

  // The hook takes a required English name; a holder with no company has neither, so skip it.
  const companyName = holder?.companyName
    ? localizeCompanyName(holder.companyName, holder.companyNameLocal)
    : null;

  /**
   * Who to name, and it is not always a person.
   *
   * At the approval step the work is with a COMMITTEE — naming whichever member holds the task
   * tells a credit officer nothing they can act on, where the sitting tells them when a decision
   * is due. Where an outside firm holds the work, the firm is the counterparty credit deals with;
   * the individual keying it in rides along on the second line, and the firm's switchboard is the
   * number that will actually be answered.
   */
  const committee = isApproval ? committeeName(t, approvedByCommittee) : null;
  const isMeeting = !!isApproval && !!(committee || meeting?.title);
  const isCompany = !isMeeting && !!companyName;

  /**
   * A queued task has no person on it — it is sitting in a pool. Naming the pool ("IntAdmin") says
   * where the work is; the previous fallback said "unassigned", which reads as "nobody picked this
   * up" when in fact it is exactly where it should be.
   */
  const pool = poolLabel(holder?.poolName);
  // A pool is a desk, not a person: it takes the group icon, not two initials of a group name.
  const isPool = !isMeeting && !isCompany && !holder?.name && !!pool;
  const isOrg = isMeeting || isCompany || isPool;

  /**
   * `assignedTo` is the last fallback, not an afterthought: the join to auth.AspNetUsers can miss
   * — no row for that UserName, or FirstName and LastName both blank, which the LDAP path leaves
   * — and then Name/Email/Department all come back NULL while the code is still there. Without it
   * the card read "not yet assigned" while ProgressSpine, from the SAME task on the SAME screen,
   * printed the code, because the spine has always had this fallback.
   */
  const who = isMeeting
    ? committee?.short || meeting?.title || null
    : companyName || holder?.name || pool || holder?.companyName || holder?.assignedTo || null;

  // Only for a named person: a pool name is already a code, and a firm has no login. Keyed off
  // `who` rather than `holder.name` so it is not suppressed in the fallback case above — where
  // loginCode then returns null anyway, because the name IS the code.
  const login = isOrg || !who ? null : loginCode(holder?.assignedTo, who);
  // The committee's full name is several times the column's width — it lives in the tooltip.
  const whoTitle = isMeeting ? committee?.full || meeting?.title || undefined : who || undefined;

  /**
   * For external work the firm's own admin is the contact, not the appraiser on the task: the
   * appraiser is out on site, and which of the firm's staff did the work is the appraisal side's
   * business. The firm's switchboard comes before any individual number for the same reason.
   */
  // The holder's OWN company columns come first, because the NAME above is resolved from them —
  // `ac`/`pc` on the task row. `externalCompany` is a different resolver (the latest live
  // AppraisalAssignments row), and preferring it for the number while the name came from the task
  // meant the two halves of one card could name one firm and dial another. They agree on an
  // assigned appraisal; this ordering means the card stays coherent even when they do not — a
  // stale pool task left by a firm that was reassigned away, for instance.
  const phone = isCompany
    ? holder?.companyPhone || externalCompany?.phone || externalCompany?.adminPhone || null
    : holder?.phoneNumber || holder?.companyPhone || null;
  const email = isCompany
    ? holder?.companyEmail || externalCompany?.email || externalCompany?.adminEmail || null
    : holder?.email || holder?.companyEmail || null;

  const subtitle = isMeeting
    ? [meeting?.title, meeting?.startAt ? meetingDate(meeting.startAt) : null]
        .filter(Boolean)
        .join(' · ') || null
    : isCompany
      ? // Same ordering rule as the phone and the email above: the task's own contact person
        // first, then the assignment's. Naming the coordinator of a firm the card is not showing
        // is the one thing worse than naming nobody.
        (holder?.companyContactPerson ?? null)
        ? t('activityTracking.brief.holder.contactPerson', {
            name: holder!.companyContactPerson,
          })
        : externalCompany?.adminName
          ? t('activityTracking.brief.holder.coordinator', { name: externalCompany.adminName })
          : externalCompany?.contactPerson
            ? t('activityTracking.brief.holder.contactPerson', {
                name: externalCompany.contactPerson,
              })
            : t('activityTracking.brief.holder.externalFirm')
      : [holder?.position, holder?.department].filter(Boolean).join(' · ') || null;

  return (
    <div className="border-l-2 border-primary pl-3">
      <p className="text-[11px] uppercase tracking-[0.09em] text-gray-400">
        {t('activityTracking.brief.holder.currentLabel')}
      </p>

      {who ? (
        <div className="mt-1.5 flex items-center gap-2.5">
          <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
            {isOrg ? (
              <Icon
                name={isMeeting ? 'gavel' : isPool ? 'users' : 'building'}
                style="solid"
                className="h-3.5 w-3.5"
              />
            ) : (
              initials(who)
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900" title={whoTitle}>
              {who}
              {login && <span className="font-normal text-gray-400"> ({login})</span>}
            </p>
            {subtitle && (
              <p className="truncate text-xs text-gray-500" title={subtitle}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-1.5 text-sm text-gray-400">
          {pending ? '—' : t('activityTracking.brief.holder.unassigned')}
        </p>
      )}

      {stepLabel && (
        <p className="mt-2 text-xs text-gray-600">
          <span className="text-gray-400">{t('activityTracking.brief.holder.step')}</span>{' '}
          {stepLabel}
        </p>
      )}
      {holder?.heldSince && (
        <p className="text-xs text-gray-400">{heldSinceText(t, holder.heldSince)}</p>
      )}

      {/* A committee step fans out to several reviewers at once. Naming only the latest without
          saying so would read as "one person is sitting on this", which is not what happened. */}
      {!!holder && holder.pendingCount > 1 && (
        <p className="mt-1 text-xs text-gray-500">
          {t('activityTracking.brief.holder.committeeReviewers', { count: holder.pendingCount })}
        </p>
      )}

      {(phone || email) && (
        <div className="mt-2.5 flex flex-col gap-1">
          {/* Phone is TEXT, not a tel: link. The column is free text and half the firms write a
              range ("0-2951-9003-4") or an extension, which no parse turns into one dialable
              number — a tap that dials the wrong place is worse than no tap. Email stays a link:
              mailto has no such ambiguity. */}
          {phone && (
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
              <Icon name="phone" style="solid" className="h-3 w-3 flex-none text-gray-400" />
              <span className="truncate">{phone}</span>
            </span>
          )}
          {email && (
            <a
              href={`mailto:${email}`}
              className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-primary hover:underline"
            >
              <Icon name="envelope" style="solid" className="h-3 w-3 flex-none text-gray-400" />
              <span className="truncate">{email}</span>
            </a>
          )}
          {/* Staff only. An external valuation firm is outside the bank's Teams tenant, so a chat
              link against its generic mailbox would resolve to nobody — they get phone and mail. */}
          {!isOrg && holder?.email && (
            <a
              href={teamsChatUrl(holder.email)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-primary hover:underline"
            >
              <Icon name="comments" style="solid" className="h-3 w-3 flex-none text-gray-400" />
              <span>{t('activityTracking.brief.holder.teamsChat')}</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default HolderCard;
