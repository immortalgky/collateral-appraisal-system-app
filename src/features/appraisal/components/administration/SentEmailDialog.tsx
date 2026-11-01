import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Button from '@/shared/components/Button';
import SlideOverPanel from '@/shared/components/SlideOverPanel';
import Icon from '@/shared/components/Icon';
import { formatFileSize } from '@/shared/utils/formatUtils';
import { saveBlob } from '@/shared/utils/saveBlob';
import { useDownloadDocument, useViewDocument } from '@/features/request/api/documents';
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

/**
 * A link opens in a new tab (the sandbox lets that one escape it) rather than replace the email in the frame.
 * The style is the Notification shell's body font, size, line height and colour (EmailTemplateRenderer): the
 * stored body is only the inner HTML, which would otherwise fall back to the browser's serif.
 */
const LINKS_OUT =
  "<base target=\"_blank\"><style>body{font-family:'Sarabun',Tahoma,'Segoe UI',sans-serif;font-size:14px;line-height:1.7;color:#3a3a3a;margin:12px 16px}</style>";
/** After a leading doctype, so a full document keeps its standards mode. */
const withLinksOut = (html: string) =>
  html.replace(/^(\s*<!doctype[^>]*>)?/i, head => head + LINKS_OUT);

/** The name for a file that has none: "attachment" plus the extension its type implies, when known. */
const EXTENSIONS: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
};
// "application/pdf; charset=binary" is the type without its parameters, in lower case.
const downloadName = (mimeType: string) =>
  `attachment${EXTENSIONS[mimeType.split(';')[0].trim().toLowerCase()] ?? ''}`;

const Dash = () => <span className="text-(--palette-gray-400)">—</span>;

/** "View sent": the resolved To / Cc, subject, body and files of one email, as they went out. */
export default function SentEmailDialog({ appraisalId, emailId, onClose }: SentEmailDialogProps) {
  const { t } = useTranslation(['appraisal', 'common']);
  // The last email opened stays while the dialog closes, so the close does not flash a spinner.
  // Another appraisal (the page can stay mounted) starts over.
  const [shown, setShown] = useState({ appraisalId, emailId });
  if (shown.appraisalId !== appraisalId || (emailId && emailId !== shown.emailId))
    setShown({ appraisalId, emailId });
  const shownId = shown.appraisalId === appraisalId ? shown.emailId : emailId;
  const {
    data: email,
    isError,
    refetch,
    isFetching,
  } = useGetAssignmentEmailSent(appraisalId, shownId);
  const viewDocument = useViewDocument();
  const download = useDownloadDocument();
  // One download at a time: the buttons share one mutation, and a second click would drop the first.
  const [saving, setSaving] = useState(false);
  const save = (documentId: string, fileName: string | null) => {
    setSaving(true);
    return download
      .mutateAsync(documentId)
      .then(result =>
        saveBlob(result.blob, result.fileName ?? fileName ?? downloadName(result.blob.type)),
      )
      .catch(() => toast.error(t('administration.email.view.downloadFailed')))
      .finally(() => setSaving(false));
  };

  return (
    <SlideOverPanel
      isOpen={!!emailId}
      onClose={onClose}
      title={t('administration.email.view.title')}
      width="drawer"
      lightOverlay
      footer={
        email ? (
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              {t('common:actions.close')}
            </Button>
          </div>
        ) : undefined
      }
    >
      {email ? (
        <div className="flex min-h-full flex-col gap-3">
          <dl className="flex flex-col gap-1.5">
            <Field label={t('administration.email.to')}>
              {email.sentTo.join(', ') || <Dash />}
            </Field>
            <Field label={t('administration.email.ccLabel')}>
              {email.sentCc.join(', ') || <Dash />}
            </Field>
            <Field label={t('administration.email.subject')}>{email.subject}</Field>
          </dl>
          {/* The stored HTML, exactly as sent; the sandbox runs no script or form and
              allows only a link to open a new tab (remote images in the body still load, as in the company's mail client).
              White on purpose: it is the email as the company reads it (a paper preview, 17.13). */}
          <iframe
            title={t('administration.email.view.body')}
            srcDoc={withLinksOut(email.bodyHtml)}
            sandbox="allow-popups allow-popups-to-escape-sandbox"
            className="min-h-[22rem] w-full flex-1 rounded-ctl border border-(--palette-line) bg-white"
          />
          {email.attachments.length > 0 && (
            <ul aria-label={t('administration.email.attachments')} className="flex flex-col gap-1">
              {email.attachments.map(a => {
                const name = a.fileName ?? a.documentId;
                return (
                  <li key={a.documentId} className="flex items-center gap-2 text-sm">
                    <Icon name="paperclip" style="solid" className="text-(--palette-gray-500)" />
                    <button
                      type="button"
                      onClick={() => viewDocument(a.documentId, a.fileSizeBytes, a.fileName)}
                      className="min-w-0 truncate text-left font-medium text-(--palette-primary-text) hover:underline"
                      title={name}
                    >
                      {name}
                    </button>
                    {!!a.fileSizeBytes && (
                      <span className="text-xs text-(--palette-gray-500) tabular-nums">
                        {formatFileSize(a.fileSizeBytes)}
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void save(a.documentId, a.fileName)}
                      aria-label={t('administration.email.view.download', { name })}
                      title={t('administration.email.view.download', { name })}
                      className="flex size-6 items-center justify-center rounded-md text-(--palette-gray-400) hover:bg-(--palette-surface-3) hover:text-(--palette-primary-text) disabled:cursor-wait disabled:opacity-50"
                    >
                      <Icon name="arrow-down-to-line" style="solid" />
                    </button>
                  </li>
                );
              })}
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
    </SlideOverPanel>
  );
}
