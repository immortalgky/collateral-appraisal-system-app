import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from './Modal';
import Button from './Button';
import { emailFormSchema, type EmailFormValues } from '@/shared/schemas/email';

interface EmailCompositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  defaultValues?: Partial<EmailFormValues>;
  showCc?: boolean;
  showBcc?: boolean;
  showAttachments?: boolean;
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
    </Modal>
  );
};

export default EmailCompositionModal;
