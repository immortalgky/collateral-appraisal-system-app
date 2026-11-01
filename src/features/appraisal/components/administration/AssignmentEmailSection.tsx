import { useTranslation } from 'react-i18next';
import Badge, { type BadgeTone } from '@/shared/components/Badge';
import Button from '@/shared/components/Button';
import { formatLocaleDateTime } from '@/shared/utils/dateUtils';
import {
  type AssignmentEmailHistoryItem,
  type AssignmentEmailStatus,
} from '../../api/assignmentEmail';

const TONE: Record<AssignmentEmailStatus, BadgeTone> = {
  Pending: 'yellow',
  Queued: 'yellow',
  Sent: 'teal',
  Failed: 'red',
  NotSent: 'gray',
};

/** A time that does not parse is left out, with its label (the status still reads). */
function When({ at, label }: { at: string | null; label?: string }) {
  const { i18n } = useTranslation();
  if (!at || isNaN(Date.parse(at))) return null;
  const time = <time dateTime={at}>{formatLocaleDateTime(at, i18n.language)}</time>;
  return label ? (
    <>
      {label} <span className="font-medium text-(--palette-ink)">{time}</span>{' '}
    </>
  ) : (
    time
  );
}

interface AssignmentEmailSectionProps {
  /** The case's emails, newest first (useGetAssignmentEmailHistory; the page reads it once for both slips). */
  items: AssignmentEmailHistoryItem[];
  /** The case is still open: the server refuses a send once it is completed or cancelled. */
  canSend: boolean;
  /** "View sent": the email to show. */
  onView: (emailId: string) => void;
  /** "Send again" / "Send email": the email to pre-fill from, null = the template (nothing was sent). */
  onResend: (fromEmailId: string | null) => void;
}

/**
 * "Email to the company" on the read-only slip (EXT / EXTO): the latest email's status, the history and the
 * actions, which stay usable while the rest of the page is read-only. Nothing when the case has no
 * email, or the history is refused (only an admin may read it).
 */
export default function AssignmentEmailSection({
  items,
  canSend,
  onView,
  onResend,
}: AssignmentEmailSectionProps) {
  const { t } = useTranslation('appraisal');
  const [latest] = items;
  if (!latest) return null;
  // What the company last received: a later send that failed or is on its way does not hide it.
  // Only from the current assignment (down to its own email, the newest non-resend): an older one
  // may have gone to another company.
  const ownIndex = items.findIndex(e => !e.isResend);
  const current = ownIndex < 0 ? items : items.slice(0, ownIndex + 1);
  const lastSent = current.find(e => e.status === 'Sent');

  // From the latest email; a NotSent one holds only the choice, so the template. Never an older
  // one: it may be the previous assignment's, to another company.
  const prefill = latest.status === 'NotSent' ? null : latest.id;
  // Not while the latest email waits to go out: Pending is refused by the server (it would go twice),
  // and a Queued one is on its way (both read "waiting to send"; the slip polls until it ends).
  const canResend = canSend && latest.status !== 'Pending' && latest.status !== 'Queued';

  return (
    <section
      aria-label={t('administration.email.title')}
      className="border-b border-(--palette-line-soft) px-5 py-2.5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-(--palette-gray-500)">{t('administration.email.title')}</span>
        <Badge tone={TONE[latest.status]} className="whitespace-nowrap">
          {t(`administration.email.status.${latest.status}`)}
        </Badge>
      </div>
      <LatestLine email={latest} />

      {items.length > 1 && (
        <ul
          aria-label={t('administration.email.history.title')}
          className="mt-2 border-t border-dashed border-(--palette-line) pt-1.5"
        >
          {items.map(e => (
            <li key={e.id} className="flex justify-between gap-2 py-0.5 text-xs">
              <span className="min-w-0 text-(--palette-gray-600)">
                <HistoryRow email={e} />
              </span>
              <span className="shrink-0 text-(--palette-gray-500) tabular-nums">
                <When at={e.sentAt ?? e.createdAt} />
              </span>
            </li>
          ))}
        </ul>
      )}

      {(canResend || lastSent) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {canResend && (
            <Button variant="outline" size="xs" onClick={() => onResend(prefill)}>
              {t(
                latest.status === 'NotSent'
                  ? 'administration.email.sendNow'
                  : 'administration.email.resend',
              )}
            </Button>
          )}
          {lastSent && (
            <Button variant="ghost" size="xs" onClick={() => onView(lastSent.id)}>
              {t('administration.email.viewSent')}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

function LatestLine({ email }: { email: AssignmentEmailHistoryItem }) {
  const { t } = useTranslation('appraisal');
  const to = email.sentTo.join(', ');
  return (
    <div className="mt-1 text-xs leading-normal text-(--palette-gray-600)">
      {email.status === 'NotSent' ? (
        t('administration.email.notSentHint')
      ) : (
        <>
          {email.status === 'Pending' && <div>{t('administration.email.pendingHint')}</div>}
          {email.status === 'Queued' && <div>{t('administration.email.queuedHint')}</div>}
          {email.status === 'Sent' && !email.isResend && !email.createdBy && (
            <>{t('administration.email.history.system')} · </>
          )}
          {email.status === 'Sent' && (
            <When at={email.sentAt} label={t('administration.email.sentLabel')} />
          )}
          {to && (
            <>
              {t('administration.email.toLabel')}{' '}
              <span className="font-medium break-all text-(--palette-ink)">{to}</span>
            </>
          )}
          {email.status === 'Sent' && (
            <div>
              {t('administration.email.counts', {
                cc: email.ccCount,
                files: email.attachmentCount,
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function HistoryLabel({ email: e }: { email: AssignmentEmailHistoryItem }) {
  const { t } = useTranslation('appraisal');
  if (e.status === 'NotSent') return t('administration.email.history.notSent');
  // One that did not go out is not "sent with the assignment": the row adds its status.
  if (!e.isResend && e.status !== 'Sent') return t('administration.email.history.firstEmail');
  if (!e.isResend) {
    return e.createdBy
      ? t('administration.email.history.first')
      : t('administration.email.history.system');
  }
  const by = e.createdByName?.trim() || e.createdBy?.trim();
  const label = t('administration.email.history.resend');
  return by ? `${label} · ${by}` : label;
}

/** A history row: what it was, and its status when it did not go out (yet). */
function HistoryRow({ email }: { email: AssignmentEmailHistoryItem }) {
  const { t } = useTranslation('appraisal');
  return (
    <>
      <HistoryLabel email={email} />
      {email.status !== 'Sent' &&
        email.status !== 'NotSent' &&
        ` · ${t(`administration.email.status.${email.status}`)}`}
    </>
  );
}
