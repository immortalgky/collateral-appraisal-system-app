import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from './Modal';
import Button from './Button';
import Icon from './Icon';
import { emailFormSchema, type EmailFormValues } from '@/shared/schemas/email';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import DocumentPickerModal from '@/features/meeting/components/DocumentPickerModal';
import type { PickedDocument } from '@/features/meeting/components/DocumentPickerModal';

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
  showCc?: boolean;
  showBcc?: boolean;
  showAttachments?: boolean;
  /** When set, replaces the free-text input with a document picker for the given meeting. */
  attachmentPicker?: AttachmentPickerConfig;
  subjectLabel?: string;
  isPending?: boolean;
  onSubmit: (values: EmailFormValues) => void;
}

const inputClass =
  'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

const EmailCompositionModal = ({
  isOpen,
  onClose,
  title,
  defaultValues,
  showCc = false,
  showBcc = false,
  showAttachments = false,
  attachmentPicker,
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
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="xl">
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="flex flex-col gap-3">
          {/* From */}
          <div className="flex items-start gap-3">
            <label className="w-24 shrink-0 text-right text-sm font-medium text-gray-600 pt-2">
              From
            </label>
            <div className="flex-1">
              <input {...register('from')} type="text" className={inputClass} />
              {errors.from && (
                <p className="mt-1 text-xs text-red-500">{errors.from.message}</p>
              )}
            </div>
          </div>

          {/* To */}
          <div className="flex items-start gap-3">
            <label className="w-24 shrink-0 text-right text-sm font-medium text-gray-600 pt-2">
              To
            </label>
            <div className="flex-1">
              <input {...register('to')} type="text" className={inputClass} />
              {errors.to && (
                <p className="mt-1 text-xs text-red-500">{errors.to.message}</p>
              )}
            </div>
          </div>

          {/* CC (conditional) */}
          {showCc && (
            <div className="flex items-start gap-3">
              <label className="w-24 shrink-0 text-right text-sm font-medium text-gray-600 pt-2">
                CC
              </label>
              <div className="flex-1">
                <input {...register('cc')} type="text" className={inputClass} />
                {errors.cc && (
                  <p className="mt-1 text-xs text-red-500">{errors.cc.message}</p>
                )}
              </div>
            </div>
          )}

          {/* BCC (conditional) */}
          {showBcc && (
            <div className="flex items-start gap-3">
              <label className="w-24 shrink-0 text-right text-sm font-medium text-gray-600 pt-2">
                BCC
              </label>
              <div className="flex-1">
                <input {...register('bcc')} type="text" className={inputClass} />
                {errors.bcc && (
                  <p className="mt-1 text-xs text-red-500">{errors.bcc.message}</p>
                )}
              </div>
            </div>
          )}

          {/* Subject / Title */}
          <div className="flex items-start gap-3">
            <label className="w-24 shrink-0 text-right text-sm font-medium text-gray-600 pt-2">
              {subjectLabel}
            </label>
            <div className="flex-1">
              <input {...register('subject')} type="text" className={inputClass} />
              {errors.subject && (
                <p className="mt-1 text-xs text-red-500">{errors.subject.message}</p>
              )}
            </div>
          </div>

          {/* Attachments (conditional) */}
          {showAttachments && (
            <div className="flex items-start gap-3">
              <label className="w-24 shrink-0 text-right text-sm font-medium text-gray-600 pt-2">
                Attachments
              </label>
              <div className="flex-1">
                {attachmentPicker ? (
                  /* ── Picker mode: document IDs + locked auto-PDF chip ── */
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-1.5 min-h-[38px]">
                      {/* Locked chip — auto-attached invitation PDF (display-only, NOT in submitted attachments) */}
                      <span className="bg-gray-100 text-gray-500 border border-gray-300 rounded-full px-3 py-0.5 text-sm flex items-center gap-1.5 cursor-default select-none">
                        <Icon name="lock" style="solid" className="size-3 text-gray-400" />
                        Meeting Invitation (PDF)
                      </span>
                      {/* User-picked document chips — sourced from pickedDocs (single source of truth) */}
                      {pickedDocs.map((doc) => (
                        <span
                          key={doc.id}
                          className="bg-blue-100 text-blue-800 rounded-full px-3 py-0.5 text-sm flex items-center gap-1"
                        >
                          <Icon name="file" style="regular" className="size-3" />
                          {doc.name}
                          <button
                            type="button"
                            onClick={() => handleRemovePickedAttachment(doc.id)}
                            className="ml-0.5 text-blue-600 hover:text-blue-800 leading-none"
                            aria-label={`Remove ${doc.name}`}
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={pickerDisclosure.onOpen}
                      className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 transition-colors"
                    >
                      <Icon name="paperclip" style="solid" className="size-3.5" />
                      Add attachment
                    </button>
                  </div>
                ) : (
                  /* ── Free-text chip mode (original behavior) ── */
                  <div className="flex flex-wrap items-center gap-1.5 min-h-[38px] border border-gray-300 rounded-md px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500">
                    {attachments.map((chip: string, i: number) => (
                      <span
                        key={i}
                        className="bg-blue-100 text-blue-800 rounded-full px-3 py-0.5 text-sm flex items-center gap-1"
                      >
                        {chip}
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(i)}
                          className="ml-0.5 text-blue-600 hover:text-blue-800 leading-none"
                          aria-label={`Remove ${chip}`}
                        >
                          &times;
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
                      className="flex-1 min-w-[120px] text-sm outline-none bg-transparent py-0.5"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex items-start gap-3">
            <label className="w-24 shrink-0 text-right text-sm font-medium text-gray-600 pt-2">
              Content
            </label>
            <div className="flex-1">
              <textarea
                {...register('content')}
                rows={14}
                className={inputClass + ' resize-y min-h-[8rem]'}
              />
              {errors.content && (
                <p className="mt-1 text-xs text-red-500">{errors.content.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-5 mt-2 border-t border-gray-100">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            isLoading={isPending}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {!isPending && 'Send'}
          </Button>
        </div>
      </form>
      {/* Document picker (only in picker mode) */}
      {attachmentPicker && (
        <DocumentPickerModal
          isOpen={pickerDisclosure.isOpen}
          onClose={pickerDisclosure.onClose}
          meetingId={attachmentPicker.meetingId}
          selectedIds={pickedDocs.map(d => d.id)}
          onConfirm={handlePickerConfirm}
        />
      )}
    </Modal>
  );
};

export default EmailCompositionModal;
