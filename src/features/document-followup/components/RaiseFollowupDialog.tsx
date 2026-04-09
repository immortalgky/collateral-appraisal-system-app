import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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

  return (
    <dialog className="modal modal-open z-[60]">
      <div className="modal-box bg-white rounded-2xl shadow-xl max-w-2xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Icon name="file-circle-plus" style="solid" className="size-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                Request Additional Documents
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Specify the documents needed from the request maker
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
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
                className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-600">
                    Document Request #{index + 1}
                  </span>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Icon name="trash" style="solid" className="size-3.5" />
                    </button>
                  )}
                </div>

                {/* Document Type */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Document Type <span className="text-danger">*</span>
                  </label>
                  <select
                    {...register(`lineItems.${index}.documentType`)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none bg-white"
                  >
                    <option value="">Select document type...</option>
                    {documentTypes.map(dt => (
                      <option key={dt.code} value={dt.code}>
                        {getDocumentTypeName(documentTypes, dt.code ?? '')}
                      </option>
                    ))}
                  </select>
                  {errors.lineItems?.[index]?.documentType && (
                    <p className="text-xs text-danger mt-1">
                      {errors.lineItems[index]?.documentType?.message}
                    </p>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Notes / Instructions <span className="text-danger">*</span>
                  </label>
                  <textarea
                    {...register(`lineItems.${index}.notes`)}
                    rows={3}
                    placeholder="Describe what is needed and why..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none resize-none"
                  />
                  {errors.lineItems?.[index]?.notes && (
                    <p className="text-xs text-danger mt-1">
                      {errors.lineItems[index]?.notes?.message}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {errors.lineItems && 'message' in errors.lineItems && (
            <p className="text-xs text-danger mt-2">
              {String((errors.lineItems as { message?: string }).message ?? '')}
            </p>
          )}

          {/* Add another */}
          <button
            type="button"
            onClick={() => append({ documentType: '', notes: '' })}
            className="mt-3 flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <Icon name="plus" style="solid" className="size-3.5" />
            Add another document request
          </button>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={raiseFollowup.isPending}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={raiseFollowup.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/80 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {raiseFollowup.isPending ? (
                <>
                  <Icon name="spinner" style="solid" className="size-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Icon name="paper-plane" style="solid" className="size-4" />
                  Send Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop bg-black/40" onClick={handleClose}>
        <button type="button">close</button>
      </div>
    </dialog>
  );
}
