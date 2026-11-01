import {
  Fragment,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useQueries } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { errorText } from '@/shared/utils/errorUtils';
import clsx from 'clsx';
import Modal from '@/shared/components/Modal';
import SlideOverPanel from '@/shared/components/SlideOverPanel';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import Input from '@/shared/components/Input';
import RichTextEditor from '@/shared/components/RichTextEditor';
import { fileTypeIcon } from '@/shared/utils/fileTypeIcon';
import { formatFileSize } from '@/shared/utils/formatUtils';
import { isValidEmail } from '@/shared/utils/validationUtils';
import {
  splitUploadable,
  UPLOAD_CONCURRENCY,
  UPLOAD_EXTENSIONS,
} from '@/features/request/utils/uploadFiles';
import { runLimited } from '@/shared/utils/runLimited';
import {
  createUploadSession,
  MAX_UPLOAD_BYTES,
  useGetRequestDocuments,
  useUploadDocument,
} from '@/features/request/api/documents';
import { useGetAppraisalDocuments } from '../../api/appraisalDocuments';
import {
  CC_ROLES,
  documentSizeQuery,
  useGetAssignmentEmailPreview,
  type AssignmentEmailAttachment,
  type AssignmentEmailInput,
  type AssignmentEmailPreview,
} from '../../api/assignmentEmail';
import { buttonOrigin, type LiftoffPayload } from '../../store/liftoffStore';
import { useRecipientSearch, type RecipientSuggestion } from '../../api/recipientSearch';

// The server refuses a subject with any control character or line/paragraph separator.
// eslint-disable-next-line no-control-regex
const SUBJECT_BREAKS = /[\u0000-\u001f\u007f\u2028\u2029]+/g;
const PLACEHOLDER_RE = /\{\{\s*(company|responsible)\s*\}\}/;
/** Without repeats, compared case-insensitively (an address is). */
const unique = (values: string[]) =>
  values.filter((v, i) => values.findIndex(other => other.toLowerCase() === v.toLowerCase()) === i);
const isRole = (value: string): value is (typeof CC_ROLES)[number] =>
  (CC_ROLES as readonly string[]).includes(value);

interface AssignmentEmailDialogProps {
  isOpen: boolean;
  appraisalId: string;
  requestId: string | undefined;
  /** The assign call is running. */
  isPending?: boolean;
  /**
   * The assignment in one grey line under the title: company, follow-up or keyer, fee total. The page
   * passes only the parts it knows (an automatic follow-up has no name yet), already worded.
   */
  summary?: string[];
  /** Why the last assign was refused (the dialog stays open so the admin can fix it). */
  error?: string | null;
  onClose: () => void;
  /** `null` = assign without sending the email. `origin` = the pressed button, for the success flight. */
  onAssign: (email: AssignmentEmailInput | null, origin?: LiftoffPayload['origin']) => void;
  /**
   * Set = "Send again" / "Send email" from the read-only slip: the email goes now, with nothing to assign.
   * An id pre-fills from that email; null starts from the template (nothing was sent yet).
   */
  resendFrom?: string | null;
}

/**
 * The email to the company, written at Assign for EXT / EXTO. Filled from the template (the
 * assignment draft is saved first, so the template reads this decision); nothing is kept if the
 * dialog is closed. "Restore template" reads the preview again.
 */
const AssignmentEmailDialog = (props: AssignmentEmailDialogProps) => {
  const { t } = useTranslation(['appraisal', 'common', 'request']);
  const close = () => {
    if (!props.isPending) props.onClose();
  };
  return (
    <SlideOverPanel
      isOpen={props.isOpen}
      onClose={close}
      title={t('administration.email.title')}
      subtitle={props.summary?.length ? props.summary.join(' · ') : undefined}
      width="drawer"
      lightOverlay
    >
      {/* Mounted only while open, so every open reads a fresh preview. */}
      {props.isOpen && <Composer {...props} onClose={close} />}
    </SlideOverPanel>
  );
};

const Composer = (props: AssignmentEmailDialogProps) => {
  const { t } = useTranslation(['appraisal', 'common', 'request']);
  const isResend = props.resendFrom !== undefined;
  // "Send again" opens on the preview built from the latest email (its Cc already expanded to people);
  // "restore template" reads the plain preview, and an open with nothing to send from starts there.
  const from = props.resendFrom || null;
  const template = useGetAssignmentEmailPreview(props.appraisalId, { enabled: !from });
  const prefilled = useGetAssignmentEmailPreview(props.appraisalId, { from, enabled: !!from });
  // A new key re-seeds the form from the template; files uploaded for this email are kept.
  const [version, setVersion] = useState(0);
  const [keptUploads, setKeptUploads] = useState<AssignmentEmailAttachment[]>([]);
  const fromLast = !!from && version === 0;
  const shown = fromLast ? prefilled : template;
  const data: AssignmentEmailPreview | undefined = shown.data;
  const isError = shown.isError;
  // The latest email could not be read (the template might still be).
  const lastFailed = fromLast && prefilled.isError;

  const restore = async (uploads: AssignmentEmailAttachment[]) => {
    const result = await template.refetch();
    // A failed read keeps the old data: say so, and keep the admin's edits.
    if (result.isError) toast.error(t('administration.email.loadFailed'));
    else {
      setKeptUploads(uploads);
      setVersion(v => v + 1);
    }
  };

  if (!data) {
    return (
      <div className="flex min-h-40 items-center justify-center text-sm text-(--palette-ink-2)">
        {isError ? (
          // The email cannot be written, but the assignment still can.
          <div className="flex flex-col items-center gap-3">
            <span role="alert">
              {t(
                lastFailed
                  ? 'administration.email.loadLastFailed'
                  : 'administration.email.loadFailed',
              )}
            </span>
            {props.error && (
              <span role="alert" className="text-xs text-danger-600 dark:text-(--palette-danger)">
                {props.error}
              </span>
            )}
            {/* The latest email is unreadable: the template can still be the start. */}
            {lastFailed && (
              <Button
                variant="outline"
                onClick={() => void restore([])}
                isLoading={template.isFetching}
              >
                {t('administration.email.restoreTemplate')}
              </Button>
            )}
            {/* Read again (a resend keeps the latest email's To and Cc). */}
            {isResend && (
              <Button
                variant="outline"
                onClick={() => void shown.refetch()}
                isLoading={shown.isFetching}
              >
                {t('common:actions.retry')}
              </Button>
            )}
            {!isResend && (
              <Button
                variant="outline"
                onClick={e => props.onAssign(null, buttonOrigin(e.currentTarget))}
                isLoading={props.isPending}
              >
                {t('administration.email.assignWithoutSend')}
              </Button>
            )}
          </div>
        ) : (
          <Icon name="spinner" style="solid" className="animate-spin text-xl" />
        )}
      </div>
    );
  }
  return (
    <EmailForm
      key={version}
      {...props}
      preview={data}
      templateCc={(template.data ?? prefilled.data)?.cc ?? []}
      keptUploads={keptUploads}
      onRestore={restore}
      isRestoring={template.isFetching}
    />
  );
};

interface EmailFormProps extends AssignmentEmailDialogProps {
  preview: AssignmentEmailPreview;
  keptUploads: AssignmentEmailAttachment[];
  /** The template's Cc: a role it copies that the email left out can be put back. */
  templateCc: string[];
  onRestore: (uploads: AssignmentEmailAttachment[]) => void;
  isRestoring: boolean;
}

const EmailForm = ({
  appraisalId,
  requestId,
  preview,
  keptUploads,
  templateCc,
  onRestore,
  isRestoring,
  isPending = false,
  error,
  onAssign,
  resendFrom,
}: EmailFormProps) => {
  const isResend = resendFrom !== undefined;
  const { t } = useTranslation(['appraisal', 'common', 'request']);
  const [extraTo, setExtraTo] = useState(() => unique(preview.extraTo));
  const [cc, setCc] = useState(() => unique(preview.cc));
  const [subject, setSubject] = useState(preview.subject);
  const [bodyHtml, setBodyHtml] = useState(preview.bodyHtml);
  const [attachments, setAttachments] = useState<AssignmentEmailAttachment[]>(() => [
    ...preview.attachments,
    ...keptUploads,
  ]);
  const [picking, setPicking] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Request documents list no size: read it from the document itself.
  const sizes = useQueries({
    queries: attachments
      .filter(a => a.fileSizeBytes == null)
      .map(a => documentSizeQuery(a.documentId)),
  });
  const fetched = new Map(
    attachments.filter(a => a.fileSizeBytes == null).map((a, i) => [a.documentId, sizes[i]]),
  );
  const sizeOf = (a: AssignmentEmailAttachment) =>
    a.fileSizeBytes ?? fetched.get(a.documentId)?.data ?? null;
  const sizeFailed = (a: AssignmentEmailAttachment) =>
    a.fileSizeBytes == null && !!fetched.get(a.documentId)?.isError;
  const total = attachments.reduce((sum, a) => sum + (sizeOf(a) ?? 0), 0);
  // Not sendable until every size is known: one still loading, or that failed to load, reads as 0.
  const sizesUnknown = attachments.some(a => sizeOf(a) == null);
  const tooMany = attachments.length > preview.maxAttachments;
  const tooBig = total > preview.maxAttachmentBytes;
  const largest = tooBig
    ? attachments.reduce((a, b) => ((sizeOf(b) ?? 0) > (sizeOf(a) ?? 0) ? b : a))
    : null;

  // A company we know but hold no address for: nothing reaches it unless an address is added.
  const noCompanyEmail = !!preview.companyName && !preview.companyTo;
  // Names for the address chips: the preview's people, and whoever is picked from the suggestions.
  const [pickedNames, setPickedNames] = useState<Record<string, string>>({});
  const ccNames = new Map([
    ...(preview.ccPeople ?? []).map(p => [p.email.toLowerCase(), p.name] as const),
    ...Object.entries(pickedNames),
  ]);
  const addressLabel = (value: string) => {
    if (isRole(value)) return t(`administration.email.cc.${value}`);
    const name = ccNames.get(value.toLowerCase());
    return name ? `${name} <${value}>` : value;
  };
  const onRecipientPicked = (email: string, name: string) =>
    setPickedNames(names => ({ ...names, [email.toLowerCase()]: name }));

  // Typed text that is not yet a recipient (invalid, or not committed) must not be dropped silently.
  const [toDraft, setToDraft] = useState(false);
  const [ccDraft, setCcDraft] = useState(false);

  // The editor's empty state is "<p></p>": no text and no image means no body.
  const hasBody = /<img\b/i.test(bodyHtml) || bodyHtml.replace(/<[^>]*>|&nbsp;/g, '').trim() !== '';
  const canSend =
    subject.trim().length > 0 &&
    hasBody &&
    !tooMany &&
    !tooBig &&
    !sizesUnknown &&
    !(noCompanyEmail && extraTo.length === 0) &&
    !uploading &&
    !toDraft &&
    !ccDraft &&
    !isPending;

  const upload = useUploadDocument();
  const sessionId = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const onUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const { valid, skipped } = splitUploadable(Array.from(e.target.files ?? []), MAX_UPLOAD_BYTES);
    e.target.value = '';
    if (skipped.length > 0)
      toast.error(
        t('request:toasts.uploadFilesSkipped', {
          n: skipped.length,
          names: skipped.map(item => item.file.name).join(', '),
        }),
      );
    if (valid.length === 0) return;
    setUploading(true);
    try {
      sessionId.current ??= (await createUploadSession()).sessionId;
      const session = sessionId.current;
      // Uploaded for the email only: not attached to the request or the appraisal. One failure does
      // not stop the rest; each failure says why.
      const tasks = valid.map(file => async () => {
        try {
          const result = await upload.mutateAsync({
            uploadSessionId: session,
            file,
            // Both columns (document.Documents) are nvarchar(10).
            documentType: 'EMAIL_ATT',
            documentCategory: 'email_att',
          });
          setAttachments(list => [
            ...list,
            {
              documentId: result.documentId,
              source: 'upload',
              fileName: result.fileName || file.name,
              fileSizeBytes: result.fileSize ?? file.size,
            },
          ]);
          return true;
        } catch (err) {
          toast.error(errorText(err, t('administration.email.uploadFailed')));
          return false;
        }
      });
      const done = (await runLimited(tasks, UPLOAD_CONCURRENCY)).filter(Boolean).length;
      if (valid.length > 1 && done > 0)
        toast.success(t('request:toasts.uploadSuccess', { n: done }));
    } catch (err) {
      toast.error(errorText(err, t('administration.email.uploadFailed')));
    } finally {
      setUploading(false);
    }
  };

  // The picker owns the case documents it lists; uploads stay as they are.
  const onPicked = (picked: AssignmentEmailAttachment[]) =>
    setAttachments(list => [
      ...picked.map(p => list.find(a => a.documentId === p.documentId) ?? p),
      ...list.filter(a => a.source === 'upload'),
    ]);

  // An address already a recipient is not repeated in a later list.
  const send = (e: MouseEvent<HTMLButtonElement>) => {
    const origin = buttonOrigin(e.currentTarget);
    const company = preview.companyTo?.toLowerCase();
    const to = extraTo.filter(a => a.toLowerCase() !== company);
    const taken = new Set([company, ...to.map(a => a.toLowerCase())]);
    onAssign(
      {
        extraTo: to,
        cc: cc.filter(a => isRole(a) || !taken.has(a.toLowerCase())),
        subject: subject.trim(),
        bodyHtml,
        attachments: attachments.map(({ documentId, source }) => ({ documentId, source })),
      },
      origin,
    );
  };

  return (
    <div className="flex min-h-full flex-col gap-3">
      <Row label={t('administration.email.to')}>
        <RecipientBox
          inputLabel={t('administration.email.addTo')}
          values={extraTo}
          onChange={setExtraTo}
          onDraftChange={setToDraft}
          chipLabel={addressLabel}
          onPicked={onRecipientPicked}
          leading={
            preview.companyTo ? (
              <span
                title={t('administration.email.companyLocked')}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-2.5 text-xs leading-normal text-purple-800 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300"
              >
                <Icon name="lock" style="solid" className="shrink-0" />
                <span className="truncate">
                  {preview.companyName
                    ? `${preview.companyName} <${preview.companyTo}>`
                    : preview.companyTo}
                </span>
              </span>
            ) : noCompanyEmail ? (
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-red-200 bg-danger-50 px-2.5 text-xs leading-normal text-danger-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-(--palette-danger)">
                <Icon name="lock" style="solid" className="shrink-0" />
                <span className="truncate">
                  {t('administration.email.companyNoEmail', { name: preview.companyName })}
                </span>
              </span>
            ) : (
              <span
                title={t('administration.email.companyPending')}
                className="inline-flex items-center rounded-full border border-dashed border-amber-500 bg-amber-50 px-2.5 text-xs leading-normal text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
              >
                {t('administration.email.companyPending')}
              </span>
            )
          }
        />
        {noCompanyEmail && (
          <p className="mt-1 text-xs text-danger-600 dark:text-(--palette-danger)">
            {t('administration.email.companyNoEmailHint')}
          </p>
        )}
        <p className="mt-1 text-xs text-(--palette-gray-500)">
          {[
            !noCompanyEmail && t('administration.email.toHint'),
            t('administration.email.searchHint'),
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </Row>

      <Row label={t('administration.email.ccLabel')}>
        <RecipientBox
          inputLabel={t('administration.email.addCc')}
          values={cc}
          onChange={setCc}
          onDraftChange={setCcDraft}
          chipLabel={addressLabel}
          onPicked={onRecipientPicked}
          isRoleChip={isRole}
        />
        {/* A role taken out can be put back without restoring the whole template. */}
        {CC_ROLES.some(role => templateCc.includes(role) && !cc.includes(role)) && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {CC_ROLES.filter(role => templateCc.includes(role) && !cc.includes(role)).map(role => (
              <Button
                key={role}
                variant="ghost"
                size="xs"
                onClick={() => setCc(list => [...list, role])}
              >
                {`+ ${t(`administration.email.cc.${role}`)}`}
              </Button>
            ))}
          </div>
        )}
        <p className="mt-1 text-xs text-(--palette-gray-500)">
          {[
            cc.some(isRole) && t('administration.email.ccHint'),
            t('administration.email.searchHint'),
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </Row>

      <Row label={t('administration.email.subject')} htmlFor="assignment-email-subject">
        <Input
          id="assignment-email-subject"
          value={subject}
          onChange={e => setSubject(e.target.value.replace(SUBJECT_BREAKS, ' '))}
          maxLength={500}
        />
      </Row>

      {/* The editor takes the height the drawer has left, with a floor. */}
      <div className="flex flex-1 flex-col">
        <RichTextEditor
          value={bodyHtml}
          onChange={setBodyHtml}
          highlight={PLACEHOLDER_RE}
          className="flex flex-1 flex-col"
          grow
          minHeightClass="min-h-[16rem]"
          maxHeightClass="max-h-none"
          toolbarEnd={
            // Text action, as "แก้ยอด" on the Administration page (AssignmentFeeCard `actionClass`).
            <button
              type="button"
              className="inline-flex h-[1.7143rem] items-center gap-1.5 px-2 text-xs font-medium text-(--palette-primary-text) hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
              // Only files uploaded in this dialog: an upload the latest email carried is not kept.
              onClick={() =>
                onRestore(
                  attachments.filter(
                    a =>
                      a.source === 'upload' &&
                      !preview.attachments.some(p => p.documentId === a.documentId),
                  ),
                )
              }
              disabled={isPending || uploading || isRestoring}
            >
              {isRestoring && <Icon name="spinner" style="solid" className="animate-spin" />}
              {t('administration.email.restoreTemplate')}
            </button>
          }
        />
        <p className="mt-1 text-xs text-(--palette-ink-2)">
          {t('administration.email.placeholderHint')}
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-(--palette-ink)">
            {t('administration.email.attachments')}
          </span>
          <span
            className={clsx(
              'text-xs tabular-nums',
              tooMany || tooBig
                ? 'font-medium text-danger-600 dark:text-(--palette-danger)'
                : 'text-(--palette-ink-2)',
            )}
          >
            {`${attachments.length} / ${preview.maxAttachments} · ${formatFileSize(total)} / ${formatFileSize(preview.maxAttachmentBytes)}`}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-(--palette-surface-3)">
          <div
            className={clsx('h-full', tooMany || tooBig ? 'bg-danger-600' : 'bg-primary')}
            style={{ width: `${Math.min(100, (total / preview.maxAttachmentBytes) * 100)}%` }}
          />
        </div>
        {attachments.length > 0 && (
          <ul
            aria-label={t('administration.email.attachments')}
            className="mt-1.5 flex flex-col gap-1.5"
          >
            {attachments.map(a => {
              const name = a.fileName ?? a.documentId;
              const icon = fileTypeIcon(name);
              const size = sizeOf(a);
              return (
                <li
                  key={a.documentId}
                  className={clsx(
                    'flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5',
                    a === largest
                      ? 'border-red-200 bg-danger-50 dark:border-red-500/30 dark:bg-red-500/10'
                      : 'border-(--palette-line-soft)',
                  )}
                >
                  <Icon
                    name={icon.name}
                    style="solid"
                    className={clsx('text-base', icon.className)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-(--palette-ink)" title={name}>
                      {name}
                    </span>
                    <span className="block text-xs text-(--palette-ink-2) tabular-nums">
                      {size != null
                        ? formatFileSize(size)
                        : sizeFailed(a)
                          ? t('administration.email.sizeUnknown')
                          : '…'}
                    </span>
                  </span>
                  <span
                    className={clsx(
                      'rounded-full px-2 text-xs font-medium whitespace-nowrap',
                      a.source === 'upload'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                        : 'bg-(--palette-surface-3) text-(--palette-ink-2)',
                    )}
                  >
                    {t(`administration.email.source.${a.source}`)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAttachments(list => list.filter(x => x !== a))}
                    aria-label={t('administration.email.removeItem', { name })}
                    title={t('administration.email.removeItem', { name })}
                    className="grid size-7 place-items-center rounded-md text-(--palette-ink-2) hover:bg-(--palette-surface-3)"
                  >
                    <Icon name="xmark" style="solid" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {attachments.some(sizeFailed) && (
          <p role="alert" className="mt-1.5 text-xs text-danger-600 dark:text-(--palette-danger)">
            {t('administration.email.sizeFailed')}
          </p>
        )}
        {(tooMany || tooBig) && (
          <p role="alert" className="mt-1.5 text-xs text-danger-600 dark:text-(--palette-danger)">
            {t('administration.email.overLimit')}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPicking(true)}
            leftIcon={<Icon name="plus" style="solid" />}
          >
            {t('administration.email.pickDocuments')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInput.current?.click()}
            isLoading={uploading}
            leftIcon={<Icon name="upload" style="solid" />}
          >
            {t('administration.email.uploadButton')}
          </Button>
          <input
            ref={fileInput}
            type="file"
            aria-label={t('administration.email.upload')}
            accept={UPLOAD_EXTENSIONS.join(',')}
            multiple
            hidden
            onChange={onUpload}
          />
        </div>
        <DocumentPicker
          isOpen={picking}
          appraisalId={appraisalId}
          requestId={requestId}
          selected={attachments.filter(a => a.source !== 'upload')}
          onClose={() => setPicking(false)}
          onConfirm={picked => {
            onPicked(picked);
            setPicking(false);
          }}
        />
      </div>

      {error && (
        <p role="alert" className="text-xs text-danger-600 dark:text-(--palette-danger)">
          {error}
        </p>
      )}

      {/* Pinned to the bottom of the scrolling body (the drawer's py-4 is cancelled by -mb-4). */}
      <div className="sticky bottom-0 -mx-6 -mb-4 mt-auto flex flex-col gap-2 border-t border-(--palette-line-soft) bg-(--palette-surface-2) px-6 py-3">
        {/* The hint takes its own line and wraps; the buttons below never do. The drawer's × is the close. */}
        <span className="text-xs text-(--palette-gray-500)">
          {t(isResend ? 'administration.email.resendHint' : 'administration.email.footerHint')}
        </span>
        <div className="flex items-center justify-end gap-2">
          {!isResend && (
            <Button
              variant="outline"
              className="whitespace-nowrap"
              onClick={e => onAssign(null, buttonOrigin(e.currentTarget))}
              disabled={isPending}
            >
              {t('administration.email.assignWithoutSend')}
            </Button>
          )}
          <Button
            variant="primary"
            className="whitespace-nowrap"
            onClick={send}
            disabled={!canSend}
            isLoading={isPending}
            leftIcon={<Icon name="paper-plane" style="solid" />}
          >
            {t(isResend ? 'administration.email.send' : 'administration.email.assignAndSend')}
          </Button>
        </div>
      </div>
    </div>
  );
};

/** The request's and the appraisal's documents, ticked to attach. */
const DocumentPicker = ({
  isOpen,
  appraisalId,
  requestId,
  selected,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  appraisalId: string;
  requestId: string | undefined;
  selected: AssignmentEmailAttachment[];
  onClose: () => void;
  onConfirm: (picked: AssignmentEmailAttachment[]) => void;
}) => {
  const { t } = useTranslation(['appraisal', 'common', 'request']);
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('administration.email.pickTitle')}
      size="md"
      compact
    >
      {isOpen && (
        <PickerBody
          appraisalId={appraisalId}
          requestId={requestId}
          selected={selected}
          onClose={onClose}
          onConfirm={onConfirm}
        />
      )}
    </Modal>
  );
};

const PickerBody = ({
  appraisalId,
  requestId,
  selected,
  onClose,
  onConfirm,
}: Omit<Parameters<typeof DocumentPicker>[0], 'isOpen'>) => {
  const { t } = useTranslation(['appraisal', 'common', 'request']);
  const requestDocs = useGetRequestDocuments(requestId);
  const appraisalDocs = useGetAppraisalDocuments(appraisalId);
  const [ticked, setTicked] = useState(() => new Set(selected.map(a => a.documentId)));

  const groups: {
    key: 'request' | 'appraisal';
    items: AssignmentEmailAttachment[];
    loading: boolean;
    failed: boolean;
  }[] = [
    {
      key: 'request',
      loading: requestDocs.isLoading,
      failed: requestDocs.isError,
      items: (requestDocs.data?.sections ?? []).flatMap(section =>
        section.documents
          .filter(d => d.documentId)
          .map(d => ({
            documentId: d.documentId!,
            source: 'request' as const,
            fileName: d.fileName ?? null,
            fileSizeBytes: null,
          })),
      ),
    },
    {
      key: 'appraisal',
      loading: appraisalDocs.isLoading,
      failed: appraisalDocs.isError,
      items: (appraisalDocs.data?.types ?? []).flatMap(type =>
        type.files
          .filter(f => f.documentId)
          .map(f => ({
            documentId: f.documentId!,
            source: 'appraisal' as const,
            fileName: f.fileName ?? null,
            fileSizeBytes: f.fileSizeBytes ?? null,
          })),
      ),
    },
  ];
  // A document listed in both groups is offered once (under the first).
  const seen = new Set<string>();
  for (const group of groups)
    group.items = group.items.filter(
      item => !seen.has(item.documentId) && seen.add(item.documentId),
    );
  const all = groups.flatMap(g => g.items);
  const loading = groups.some(g => g.loading);

  const toggle = (id: string) =>
    setTicked(prev => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <div className="flex flex-col gap-3">
      {groups.map(group => (
        <section key={group.key}>
          <h3 className="border-b border-(--palette-line-soft) pb-1.5 text-sm font-semibold text-(--palette-ink)">
            {t(`administration.email.source.${group.key}`)}
          </h3>
          {group.loading ? (
            <Icon
              name="spinner"
              style="solid"
              className="mt-2 animate-spin text-(--palette-ink-2)"
            />
          ) : group.failed ? (
            <p role="alert" className="py-2 text-xs text-danger-600 dark:text-(--palette-danger)">
              {t('administration.email.documentsFailed')}
            </p>
          ) : group.items.length === 0 ? (
            <p className="py-2 text-xs text-(--palette-ink-2)">
              {t('administration.email.noDocuments')}
            </p>
          ) : (
            <ul>
              {group.items.map(item => (
                <li
                  key={item.documentId}
                  className="border-b border-(--palette-line-soft) last:border-b-0"
                >
                  <label className="flex cursor-pointer items-center gap-2 py-1.5 text-sm text-(--palette-ink)">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm checkbox-primary"
                      checked={ticked.has(item.documentId)}
                      onChange={() => toggle(item.documentId)}
                    />
                    <span className="min-w-0 flex-1 truncate" title={item.fileName ?? undefined}>
                      {item.fileName ?? item.documentId}
                    </span>
                    {item.fileSizeBytes != null && (
                      <span className="text-xs text-(--palette-ink-2) tabular-nums">
                        {formatFileSize(item.fileSizeBytes)}
                      </span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
      <div className="-mx-5 -mb-3 flex items-center justify-end gap-2 border-t border-(--palette-line-soft) px-5 py-3">
        <Button variant="ghost" size="sm" onClick={onClose}>
          {t('common:actions.cancel')}
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={loading}
          // A selected document neither list shows (e.g. from the template) is kept as it is.
          onClick={() =>
            onConfirm([
              ...selected.filter(a => !seen.has(a.documentId)),
              ...all.filter(item => ticked.has(item.documentId)),
            ])
          }
        >
          {t('administration.email.attach')}
        </Button>
      </div>
    </div>
  );
};

const Row = ({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) => (
  <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-2.5">
    <label htmlFor={htmlFor} className="pt-2 text-xs font-medium text-(--palette-ink)">
      {label}
    </label>
    <div className="min-w-0">{children}</div>
  </div>
);

/** Chips plus a text input; Enter, comma or leaving the field adds the typed address. */
const RecipientBox = ({
  inputLabel,
  values,
  onChange,
  onDraftChange,
  leading,
  chipLabel = v => v,
  isRoleChip = () => false,
  onPicked,
}: {
  inputLabel: string;
  values: string[];
  onChange: (values: string[]) => void;
  /** True while the field holds text that is not a recipient yet. */
  onDraftChange: (hasText: boolean) => void;
  leading?: React.ReactNode;
  chipLabel?: (value: string) => string;
  isRoleChip?: (value: string) => boolean;
  /** A company or person chosen from the suggestions: the chip shows `name <email>`. */
  onPicked?: (email: string, name: string) => void;
}) => {
  const { t } = useTranslation(['appraisal', 'common', 'request']);
  const [text, setText] = useState('');
  const hasText = text.trim().length > 0;
  const [invalid, setInvalid] = useState(false);
  const errorId = useId();

  // Suggestions from the system: two typed characters (a leading "@" only asks for them; an "@" inside is
  // an address and keeps this a plain field). Esc closes the list until the text changes.
  const listId = useId();
  const [dismissed, setDismissed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const search = useRecipientSearch(onPicked ? text : '');
  const suggestions = search.suggestions.filter(
    s => !values.some(v => v.toLowerCase() === s.email.toLowerCase()),
  );
  // Open as soon as the text qualifies (loading, results, or nothing found); Esc closes it.
  const open = !dismissed && search.active;
  const hasOptions = open && suggestions.length > 0;
  // Text that asks for suggestions is a query, not a recipient: it neither errors nor blocks Send. Only
  // text committed as an address (and refused) does.
  const blocking = hasText && (!search.active || invalid);
  useEffect(() => onDraftChange(blocking), [blocking, onDraftChange]);
  const active = Math.min(activeIndex, suggestions.length - 1);
  const optionId = (i: number) => `${listId}-${i}`;

  const pick = (suggestion: RecipientSuggestion) => {
    onChange(unique([...values, suggestion.email]));
    onPicked?.(suggestion.email, suggestion.name);
    setText('');
    setInvalid(false);
    setDismissed(false);
    setActiveIndex(0);
  };

  // A pasted list ("a@x.com, b@y.com; c@z.com") adds every valid address; what is not valid stays
  // in the field, marked.
  const commit = (leaving = false) => {
    // Leaving the field with a query in it: nothing was chosen, so it is dropped, not an invalid address.
    if (leaving && search.active) {
      setText('');
      setInvalid(false);
      return;
    }
    // "Name <a@x.com>" (as copied from a mail client) yields the bare address.
    const parts = text.split(/[\s,;<>"]+/).filter(Boolean);
    if (parts.length === 0) return;
    const ok = parts.filter(p => isValidEmail(p) && p.length <= 254);
    // Display names around found addresses are dropped; anything else that is not one stays.
    const bad = parts.filter(p => !ok.includes(p) && (p.includes('@') || ok.length === 0));
    if (ok.length > 0) onChange(unique([...values, ...ok]));
    setText(bad.join(', '));
    setInvalid(bad.length > 0);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (hasOptions && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((active + step + suggestions.length) % suggestions.length);
    } else if (open && search.pending && e.key === 'Enter') {
      // The rows may be the last search's (dimmed): wait for this one rather than pick a stale row.
      e.preventDefault();
    } else if (hasOptions && e.key === 'Enter') {
      e.preventDefault();
      pick(suggestions[active]);
    } else if (open && e.key === 'Escape') {
      // Only the list: the drawer stays open.
      e.preventDefault();
      e.stopPropagation();
      setDismissed(true);
    } else if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && !text && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div className="relative">
      <div
        className={clsx(
          'flex min-h-ctl flex-wrap items-center gap-1.5 rounded-ctl border bg-(--form-input-bg) px-2 py-1 focus-within:border-(--focus-edge) focus-within:ring-[3px] focus-within:ring-(color:--focus-ring)',
          invalid ? 'border-danger' : 'border-(--palette-input-edge)',
        )}
      >
        {leading}
        {values.map(value => {
          const label = chipLabel(value);
          const role = isRoleChip(value);
          return (
            <span
              key={value}
              className={clsx(
                'inline-flex max-w-full items-center gap-1 rounded-full border py-px pr-0.5 pl-2.5 text-xs leading-normal',
                role
                  ? 'border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-500/30 dark:bg-(--palette-accent-wash) dark:text-(--palette-accent-ink)'
                  : 'border-(--palette-line) bg-(--palette-surface-2) text-(--palette-ink)',
              )}
            >
              {role && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-primary" />}
              <span className="truncate" title={value}>
                {label}
              </span>
              <button
                type="button"
                onClick={() => onChange(values.filter(v => v !== value))}
                aria-label={t('administration.email.removeItem', { name: label })}
                title={t('administration.email.removeItem', { name: label })}
                className="grid size-4 place-items-center rounded-full text-(--palette-ink-2) hover:bg-(--palette-surface-3)"
              >
                <Icon name="xmark" style="solid" />
              </button>
            </span>
          );
        })}
        <input
          role={onPicked ? 'combobox' : undefined}
          aria-expanded={onPicked ? open : undefined}
          aria-controls={onPicked && hasOptions ? listId : undefined}
          aria-autocomplete={onPicked ? 'list' : undefined}
          aria-activedescendant={hasOptions ? optionId(active) : undefined}
          aria-label={inputLabel}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? errorId : undefined}
          value={text}
          onChange={e => {
            setText(e.target.value);
            setInvalid(false);
            setDismissed(false);
            setActiveIndex(0);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => commit(true)}
          placeholder={t('administration.email.addAddress')}
          className="h-7 min-w-[10rem] flex-1 bg-transparent px-1 text-sm text-(--palette-ink) outline-none placeholder:text-(--palette-ink-2)"
        />
      </div>
      {open && (
        <div
          role="presentation"
          // Pressing anything in the list (a scrollbar, a status row) must not blur the input.
          onMouseDown={e => e.preventDefault()}
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-ctl border border-(--palette-line) bg-(--palette-surface) py-1 text-sm shadow-lg"
        >
          {/* Not options: the arrow keys never land on a status row. */}
          {search.waiting && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-(--palette-gray-500)"
            >
              <Icon name="spinner" style="solid" className="animate-spin" />
              {t('administration.email.searching')}
            </div>
          )}
          {suggestions.length > 0 && (
            <ul
              id={listId}
              role="listbox"
              aria-label={t('administration.email.suggestions')}
              className={clsx(search.pending && 'opacity-60')}
            >
              {suggestions.map((s, i) => (
                <Fragment key={s.key}>
                  {s.group !== suggestions[i - 1]?.group && (
                    <li
                      role="presentation"
                      className="px-3 pt-1.5 pb-0.5 text-xs font-semibold text-(--palette-gray-500)"
                    >
                      {t(
                        s.group === 'company'
                          ? 'administration.email.suggestCompanies'
                          : 'administration.email.suggestStaff',
                      )}
                    </li>
                  )}
                  <li
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === active}
                    aria-disabled={search.pending || undefined}
                  >
                    {/* onMouseDown, not click: the input keeps focus, so its blur does not commit the typed name. */}
                    <button
                      type="button"
                      tabIndex={-1}
                      onMouseDown={e => {
                        e.preventDefault();
                        // A dimmed row belongs to the last search: not pickable until this one lands.
                        if (!search.pending) pick(s);
                      }}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={clsx(
                        'w-full truncate px-3 py-1.5 text-left text-(--palette-ink)',
                        search.pending && 'cursor-wait',
                        i === active && 'bg-(--palette-accent-wash)',
                      )}
                    >
                      {`${s.name} <${s.email}>`}
                    </button>
                  </li>
                </Fragment>
              ))}
            </ul>
          )}
          {search.browse && (
            <div
              role="status"
              aria-live="polite"
              className="border-t border-(--palette-line-soft) px-3 py-1.5 text-xs text-(--palette-gray-500)"
            >
              {t('administration.email.browseFooter')}
            </div>
          )}
          {!search.waiting && suggestions.length === 0 && !search.partial && (
            <div
              role="status"
              aria-live="polite"
              className="px-3 py-1.5 text-xs text-(--palette-gray-500)"
            >
              {t(
                search.suggestions.length > 0
                  ? 'administration.email.allAdded'
                  : 'administration.email.noMatches',
              )}
            </div>
          )}
          {search.partial && (
            <div
              role="status"
              aria-live="polite"
              className="px-3 py-1.5 text-xs text-(--palette-gray-500)"
            >
              {t('administration.email.searchPartial')}
            </div>
          )}
        </div>
      )}
      {invalid && (
        <p id={errorId} className="mt-1 text-xs text-danger-600 dark:text-(--palette-danger)">
          {t('common:validation.invalidEmail')}
        </p>
      )}
    </div>
  );
};

export default AssignmentEmailDialog;
