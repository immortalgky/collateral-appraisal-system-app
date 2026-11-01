import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@/shared/components/Button';
import Modal from '@/shared/components/Modal';
import Icon from '@/shared/components/Icon';
import { formatFileSize } from '@/shared/utils/formatUtils';
import { useGetAssignmentEmailSent } from '../../api/assignmentEmail';

interface SentEmailDialogProps {
  appraisalId: string;
  /** The email to show; null = closed. */
  emailId: string | null;
  onClose: () => void;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[5rem_minmax(0,1fr)] items-baseline gap-2 text-sm">
      <dt className="text-xs leading-normal text-(--palette-gray-500)">{label}</dt>
      <dd className="break-words text-(--palette-ink)">{children}</dd>
    </div>
  );
}

/** Links would open inside the frame and replace the email; the sandbox blocks the new tab, so a click does nothing. */
const LINKS_OUT = '<base target="_blank">';
/** After a leading doctype, so a full document keeps its standards mode. */
const withLinksOut = (html: string) =>
  html.replace(/^(\s*<!doctype[^>]*>)?/i, head => head + LINKS_OUT);

const Dash = () => <span className="text-(--palette-gray-400)">—</span>;

/** "View sent": the resolved To / Cc, subject, body and files of one email, as they went out. */
export default function SentEmailDialog({ appraisalId, emailId, onClose }: SentEmailDialogProps) {
  const { t } = useTranslation(['appraisal', 'common']);
  // The last email opened stays while the dialog closes, so the close does not flash a spinner.
  const [shownId, setShownId] = useState(emailId);
  if (emailId && emailId !== shownId) setShownId(emailId);
  const {
    data: email,
    isError,
    refetch,
    isFetching,
  } = useGetAssignmentEmailSent(appraisalId, shownId);

  return (
    <Modal
      isOpen={!!emailId}
      onClose={onClose}
      title={t('administration.email.view.title')}
      size="xl"
    >
      {email ? (
        <div className="flex flex-col gap-3">
          <dl className="flex flex-col gap-1.5">
            <Field label={t('administration.email.to')}>
              {email.sentTo.join(', ') || <Dash />}
            </Field>
            <Field label={t('administration.email.ccLabel')}>
              {email.sentCc.join(', ') || <Dash />}
            </Field>
            <Field label={t('administration.email.subject')}>{email.subject}</Field>
          </dl>
          {/* The stored HTML, exactly as sent; an empty sandbox runs no script, form or
              navigation (remote images in the body still load, as in the company's mail client).
              White on purpose: it is the email as the company reads it (a paper preview, 17.13). */}
          <iframe
            title={t('administration.email.view.body')}
            srcDoc={withLinksOut(email.bodyHtml)}
            sandbox=""
            className="h-[22rem] w-full rounded-ctl border border-(--palette-line) bg-white"
          />
          {email.attachments.length > 0 && (
            <ul aria-label={t('administration.email.attachments')} className="flex flex-col gap-1">
              {email.attachments.map(a => (
                <li key={a.documentId} className="flex items-center gap-2 text-sm">
                  <Icon name="paperclip" style="solid" className="text-(--palette-gray-500)" />
                  <span className="min-w-0 truncate" title={a.fileName ?? a.documentId}>
                    {a.fileName ?? a.documentId}
                  </span>
                  {!!a.fileSizeBytes && (
                    <span className="text-xs text-(--palette-gray-500) tabular-nums">
                      {formatFileSize(a.fileSizeBytes)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="flex min-h-40 items-center justify-center text-sm text-(--palette-gray-500)">
          {isError ? (
            <div className="flex flex-col items-center gap-3">
              <span role="alert">{t('administration.email.view.loadFailed')}</span>
              <Button variant="outline" onClick={() => void refetch()} isLoading={isFetching}>
                {t('common:actions.retry')}
              </Button>
            </div>
          ) : (
            <Icon name="spinner" style="solid" className="animate-spin text-xl" />
          )}
        </div>
      )}
    </Modal>
  );
}
