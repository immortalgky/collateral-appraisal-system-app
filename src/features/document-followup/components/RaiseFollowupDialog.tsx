import '@/features/document-followup/i18n';
import { createPortal } from 'react-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { ValidationText } from '@/shared/components/form/ValidationText';
import NativeSelect from '@/shared/components/inputs/NativeSelect';
import Icon from '@/shared/components/Icon';
import { useGetDocumentTypes, getDocumentTypeName } from '@/features/request/api/documentTypes';
import { raiseFollowupSchema, type RaiseFollowupFormValues } from '../schemas/followup';
import { useRaiseFollowup } from '../hooks/useRaiseFollowup';

interface RaiseFollowupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  workflowInstanceId: string;
  taskId: string;
}

export function RaiseFollowupDialog({
  isOpen,
  onClose,
  workflowInstanceId,
  taskId,
}: RaiseFollowupDialogProps) {
  const { t } = useTranslation(['documentFollowup', 'common']);
  const { data: documentTypes = [] } = useGetDocumentTypes();
  const raiseFollowup = useRaiseFollowup();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RaiseFollowupFormValues>({
    resolver: zodResolver(raiseFollowupSchema),
    defaultValues: {
      lineItems: [{ documentType: '', notes: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lineItems',
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = (values: RaiseFollowupFormValues) => {
    raiseFollowup.mutate(
      {
        raisingWorkflowInstanceId: workflowInstanceId,
        raisingTaskId: taskId,
        lineItems: values.lineItems,
      },
      {
        onSuccess: () => {
          handleClose();
        },
      },
    );
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="modal modal-open z-[60]" role="dialog" aria-modal="true">
      <div className="modal-box bg-(--palette-surface) rounded-2xl shadow-xl max-w-2xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-(--palette-warn-wash) flex items-center justify-center">
              <Icon
                name="file-circle-plus"
                style="solid"
                className="size-5 text-amber-600 dark:text-amber-400"
              />
            </div>
            <div>
              <h3 className="text-base font-semibold text-(--palette-ink)">
                {t('raiseDialog.title')}
              </h3>
              <p className="text-xs text-(--palette-gray-500) mt-0.5">
                {t('raiseDialog.subtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label={t('aria.closeDialog')}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-(--palette-gray-400) hover:text-(--palette-gray-600) hover:bg-(--palette-surface-3) transition-colors"
          >
            <Icon name="xmark" style="solid" className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Line Items */}
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="p-4 rounded-xl border border-(--palette-line) bg-(--palette-surface-2) space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-(--palette-gray-600)">
                    {t('raiseDialog.requestLabel', { number: index + 1 })}
                  </span>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="w-6 h-6 flex items-center justify-center rounded-md text-(--palette-gray-400) hover:text-red-500 hover:bg-(--palette-req-wash) transition-colors"
                    >
                      <Icon name="trash" style="solid" className="size-3.5" />
                    </button>
                  )}
                </div>

                {/* Document Type */}
                <div>
                  <label className="block text-xs font-medium text-(--palette-ink) mb-1">
                    {t('raiseDialog.documentTypeLabel')} <span className="text-danger">*</span>
                  </label>
                  <NativeSelect {...register(`lineItems.${index}.documentType`)} className="w-full">
                    <option value="">{t('raiseDialog.documentTypePlaceholder')}</option>
                    {documentTypes.map(dt => (
                      <option key={dt.code} value={dt.code}>
                        {getDocumentTypeName(documentTypes, dt.code ?? '')}
                      </option>
                    ))}
                  </NativeSelect>
                  {errors.lineItems?.[index]?.documentType && (
                    <p className="text-xs text-danger mt-1">
                      <ValidationText message={errors.lineItems[index]?.documentType?.message} />
                    </p>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-medium text-(--palette-ink) mb-1">
                    {t('raiseDialog.notesLabel')} <span className="text-danger">*</span>
                  </label>
                  <textarea
                    {...register(`lineItems.${index}.notes`)}
                    rows={3}
                    maxLength={4000}
                    placeholder={t('raiseDialog.notesPlaceholder')}
                    className="w-full px-3 py-2 text-sm border border-(--palette-line) rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none resize-none"
                  />
                  {errors.lineItems?.[index]?.notes && (
                    <p className="text-xs text-danger mt-1">
                      <ValidationText message={errors.lineItems[index]?.notes?.message} />
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {errors.lineItems && 'message' in errors.lineItems && (
            <p className="text-xs text-danger mt-2">
              <ValidationText message={(errors.lineItems as { message?: string }).message} />
            </p>
          )}

          {/* Add another */}
          <button
            type="button"
            onClick={() => append({ documentType: '', notes: '' })}
            className="mt-3 flex items-center gap-1.5 text-sm text-(--palette-primary-text) hover:text-(--palette-primary-text)/80 transition-colors"
          >
            <Icon name="plus" style="solid" className="size-3.5" />
            {t('raiseDialog.addAnother')}
          </button>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-(--palette-line-soft)">
            <button
              type="button"
              onClick={handleClose}
              disabled={raiseFollowup.isPending}
              className="px-4 py-2 text-sm font-medium text-(--palette-ink) bg-(--palette-surface-3) hover:bg-(--palette-line) rounded-xl transition-colors disabled:opacity-50"
            >
              {t('common:actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={raiseFollowup.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/80 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {raiseFollowup.isPending ? (
                <>
                  <Icon name="spinner" style="solid" className="size-4 animate-spin" />
                  {t('raiseDialog.submitting')}
                </>
              ) : (
                <>
                  <Icon name="paper-plane" style="solid" className="size-4" />
                  {t('raiseDialog.sendRequest')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop bg-black/40" onClick={handleClose}>
        <button type="button">{t('aria.closeDialog')}</button>
      </div>
    </div>,
    document.body,
  );
}
