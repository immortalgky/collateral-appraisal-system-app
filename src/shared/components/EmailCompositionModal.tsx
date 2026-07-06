import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import Modal from './Modal';
import Button from './Button';
import Icon from './Icon';
import { emailFormSchema, type EmailFormValues } from '@/shared/schemas/email';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import MeetingDocumentsDialog from '@/features/meeting/components/MeetingDocumentsDialog';
import type { PickedDocument } from '@/features/meeting/components/MeetingDocumentsDialog';
import { useViewDocument } from '@/features/request/api/documents';
import { fileTypeIcon } from '@/shared/utils/fileTypeIcon';

/**
 * When provided, replaces the free-text attachment chip input with a document
 * picker sourced from the given meeting's document library. Quotation flows that
 * use `showAttachments={false}` are unaffected — this prop is only consulted
 * when `showAttachments` is also true.
 */
interface AttachmentPickerConfig {
  meetingId: string;
}

interface EmailCompositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  defaultValues?: Partial<EmailFormValues>;
  /** Show the (usually config-fixed) From field. Defaults to true. */
  showFrom?: boolean;
  showCc?: boolean;
  showBcc?: boolean;
  showAttachments?: boolean;
  /** When set, replaces the free-text input with a document picker for the given meeting. */
  attachmentPicker?: AttachmentPickerConfig;
  /** When true, at least one attachment is required to submit. */
  requireAttachment?: boolean;
  subjectLabel?: string;
  isPending?: boolean;
  onSubmit: (values: EmailFormValues) => void;
}

const fieldClass =
  'w-full rounded-lg border border-gray-200 bg-gray-50/60 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20';
const labelClass =
  'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500';

const EmailCompositionModal = ({
  isOpen,
  onClose,
  title,
  defaultValues,
  showFrom = true,
  showCc = false,
  showBcc = false,
  showAttachments = false,
  attachmentPicker,
  requireAttachment = false,
  subjectLabel = 'Subject',
  isPending = false,
  onSubmit,
}: EmailCompositionModalProps) => {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      from: '',
      to: '',
      cc: '',
      bcc: '',
      subject: '',
      content: '',
      attachments: [],
      ...defaultValues,
    },
  });

  const attachments = watch('attachments') ?? [];
  const [attachmentInput, setAttachmentInput] = useState('');
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  // Single source of truth for picker mode: docs the user has selected
  const [pickedDocs, setPickedDocs] = useState<PickedDocument[]>([]);
  const pickerDisclosure = useDisclosure();
  const [attachmentError, setAttachmentError] = useState(false);

  const viewDocument = useViewDocument();

  useEffect(() => {
    if (isOpen) {
      reset({
        from: '',
        to: '',
        cc: '',
        bcc: '',
        subject: '',
        content: '',
        attachments: [],
        ...defaultValues,
      });
      setAttachmentInput('');
      setPickedDocs([]);
      setAttachmentError(false);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear the required-attachment error once at least one is present.
  useEffect(() => {
    if (attachments.length > 0) setAttachmentError(false);
  }, [attachments.length]);

  const handleAddAttachment = () => {
    const trimmed = attachmentInput.trim();
    if (!trimmed) return;
    if (attachments.length >= 10) return;
    if (trimmed.length > 200) return;
    setValue('attachments', [...attachments, trimmed]);
    setAttachmentInput('');
    attachmentInputRef.current?.focus();
  };

  const handleAttachmentKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddAttachment();
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setValue(
      'attachments',
      attachments.filter((_: string, i: number) => i !== index),
    );
  };

  const handlePickerConfirm = (picked: PickedDocument[]) => {
    setPickedDocs(picked);
    setValue('attachments', picked.map(p => p.id));
  };

  const handleRemovePickedAttachment = (id: string) => {
    const next = pickedDocs.filter(d => d.id !== id);
    setPickedDocs(next);
    setValue('attachments', next.map(d => d.id));
  };

  const handleClose = () => {
    if (!isPending) onClose();
  };

  const submit = (data: EmailFormValues) => {
    // Count non-blank entries, mirroring the backend validator — a blank/whitespace
    // attachment must not satisfy the "at least one attachment" requirement.
    if (requireAttachment && !data.attachments?.some(a => a.trim().length > 0)) {
      setAttachmentError(true);
      return;
    }
    onSubmit(data);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="xl">
      <form onSubmit={handleSubmit(submit)} noValidate className="flex flex-col gap-4">
        {/* From (optional — hidden when the sender is fixed by server config) */}
        {showFrom && (
          <div>
            <label className={labelClass}>From</label>
            <input {...register('from')} type="text" className={fieldClass} />
            {errors.from && (
              <p className="mt-1 text-xs text-red-500">{errors.from.message}</p>
            )}
          </div>
        )}

        {/* To */}
        <div>
          <label className={labelClass}>To</label>
          <input
            {...register('to')}
            type="text"
            placeholder="name@lhbank.com"
            className={fieldClass}
          />
          {errors.to && <p className="mt-1 text-xs text-red-500">{errors.to.message}</p>}
        </div>

        {/* Cc */}
        {showCc && (
          <div>
            <label className={labelClass}>Cc</label>
            <input {...register('cc')} type="text" className={fieldClass} />
            {errors.cc && <p className="mt-1 text-xs text-red-500">{errors.cc.message}</p>}
          </div>
        )}

        {/* Bcc */}
        {showBcc && (
          <div>
            <label className={labelClass}>Bcc</label>
            <input {...register('bcc')} type="text" className={fieldClass} />
            {errors.bcc && <p className="mt-1 text-xs text-red-500">{errors.bcc.message}</p>}
          </div>
        )}

        {/* Subject / Title */}
        <div>
          <label className={labelClass}>{subjectLabel}</label>
          <input {...register('subject')} type="text" className={fieldClass} />
          {errors.subject && (
            <p className="mt-1 text-xs text-red-500">{errors.subject.message}</p>
          )}
        </div>

        {/* Attachments (conditional) */}
        {showAttachments && (
          <div>
            <label className={labelClass}>Attachments</label>
            {attachmentPicker ? (
              /* ── Picker mode: document chips (name opens the file, × removes it) ── */
              <div className="flex flex-col gap-2.5">
                {pickedDocs.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    {pickedDocs.map(doc => {
                      const icon = fileTypeIcon(doc.name);
                      return (
                        <span
                          key={doc.id}
                          className="group inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm transition hover:border-gray-300"
                        >
                          <button
                            type="button"
                            onClick={() => viewDocument(doc.id)}
                            title={`View ${doc.name}`}
                            className="inline-flex items-center gap-2"
                          >
                            <Icon name={icon.name} style="solid" className={clsx('size-4', icon.className)} />
                            <span className="font-medium group-hover:text-primary">{doc.name}</span>
                            <Icon
                              name="up-right-from-square"
                              style="solid"
                              className="size-3 text-gray-400 opacity-0 transition group-hover:opacity-100 group-hover:text-primary"
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePickedAttachment(doc.id)}
                            className="ml-0.5 text-gray-400 transition hover:text-red-500"
                            aria-label={`Remove ${doc.name}`}
                          >
                            <Icon name="xmark" style="solid" className="size-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
                <button
                  type="button"
                  onClick={pickerDisclosure.onOpen}
                  className={clsx(
                    'inline-flex w-fit items-center gap-1.5 rounded-lg border border-dashed px-3 py-1.5 text-sm font-medium transition',
                    attachmentError
                      ? 'border-red-400 text-red-600 hover:border-red-500'
                      : 'border-gray-300 text-gray-600 hover:border-primary hover:text-primary',
                  )}
                >
                  <Icon name="paperclip" style="solid" className="size-3.5" />
                  Add attachment
                </button>
                {attachmentError && (
                  <p className="text-xs text-red-500">Please attach at least one file.</p>
                )}
              </div>
            ) : (
              /* ── Free-text chip mode (original behavior) ── */
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-2 transition-colors focus-within:border-primary focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/20">
                {attachments.map((chip: string, i: number) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary"
                  >
                    {chip}
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(i)}
                      className="text-primary/60 transition hover:text-primary"
                      aria-label={`Remove ${chip}`}
                    >
                      <Icon name="xmark" style="solid" className="size-3" />
                    </button>
                  </span>
                ))}
                <input
                  ref={attachmentInputRef}
                  type="text"
                  value={attachmentInput}
                  onChange={e => setAttachmentInput(e.target.value)}
                  onKeyDown={handleAttachmentKeyDown}
                  placeholder={attachments.length === 0 ? 'Type and press Enter to add' : ''}
                  className="min-w-[140px] flex-1 bg-transparent py-0.5 text-sm outline-none"
                />
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div>
          <label className={labelClass}>Content</label>
          <textarea
            {...register('content')}
            rows={12}
            className={clsx(fieldClass, 'min-h-[10rem] resize-y leading-relaxed')}
          />
          {errors.content && (
            <p className="mt-1 text-xs text-red-500">{errors.content.message}</p>
          )}
        </div>

        {/* Footer — full-bleed bar (counteracts the Modal's px-6 py-4 padding) */}
        <div className="-mx-6 -mb-4 mt-1 flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50/50 px-6 py-4">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isPending}
            isLoading={isPending}
            leftIcon={
              !isPending ? (
                <Icon name="paper-plane" style="solid" className="size-4" />
              ) : undefined
            }
          >
            Send
          </Button>
        </div>
      </form>
      {/* Document picker (only in picker mode) — the meeting documents modal in select mode */}
      {attachmentPicker && (
        <MeetingDocumentsDialog
          isOpen={pickerDisclosure.isOpen}
          onClose={pickerDisclosure.onClose}
          meetingId={attachmentPicker.meetingId}
          selectable
          selectedIds={pickedDocs.map(d => d.id)}
          onConfirm={handlePickerConfirm}
        />
      )}
    </Modal>
  );
};

export default EmailCompositionModal;
