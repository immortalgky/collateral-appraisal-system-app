import { useForm, FormProvider, type SubmitHandler } from 'react-hook-form';
import {
  createSupportingDataForm,
  decisionForm,
  defaultDecision,
  defaultSupportingData,
  type createSupportingDataFormType,
  type decisionFormType,
} from '../schemas/form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ActionBar,
  Alert,
  Button,
  CancelButton,
  FormCard,
  Icon,
  Section,
} from '@/shared/components';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { FormFields } from '@/shared/components/form';
import { getDecisionFields, getSupportingDataFields } from '../configs/fields';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import toast from 'react-hot-toast';
import { SupportingDataTable } from '../components/SupportingDataTable';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useCreateDraftSupportingData,
  useDeleteSupportingDetailData,
  useGetSupportingDataById,
  useSubmitSupportingData,
  useUpdateDraftSupportingData,
  useBulkUploadSupportingDetails,
} from '../api';
import { BulkUploadDialog, type RowParseError } from '../components/BulkUploadDialog';
import { mapSupportingDataResponseToForm } from '../utils/mapper';
import { ARCHIVED_STATUSES, SUPPORTING_STATUS } from '../constants/parameters';
import { useTranslation } from 'react-i18next';

function SupportingDataMaintenanceDetailListPageSkeleton() {
  return (
    <div className="flex flex-col gap-4 justify-between min-h-full">
      <div className="flex flex-col gap-4 pr-2">
        {/* Section 1 skeleton — Supporting Data Maintenance (blue) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 animate-pulse">
          {/* Card header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <div className="size-9 rounded-lg bg-blue-100" />
            <div className="flex flex-col gap-2">
              <div className="h-4 bg-gray-200 rounded w-52" />
              <div className="h-3 bg-gray-100 rounded w-72" />
            </div>
          </div>
          {/* Form fields — matches 2 + 2 + 2 + 4 col layout */}
          <div className="p-5 grid grid-cols-12 gap-4">
            {[
              { label: 'w-24', input: 'col-span-2' },
              { label: 'w-20', input: 'col-span-2' },
              { label: 'w-24', input: 'col-span-2' },
              { label: 'w-20', input: 'col-span-4' },
            ].map((field, i) => (
              <div key={i} className={`${field.input} flex flex-col gap-1.5`}>
                <div className={`h-3.5 bg-gray-200 rounded ${field.label}`} />
                <div className="h-9 bg-gray-100 rounded-lg" />
              </div>
            ))}
          </div>
        </div>

        {/* Section 2 skeleton — Supporting Data Details (purple) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 animate-pulse">
          {/* Card header */}
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-purple-100" />
              <div className="h-4 bg-gray-200 rounded w-44" />
            </div>
            {/* Placeholder for Import Excel + Add Item buttons */}
            <div className="flex items-center gap-2">
              <div className="h-8 bg-gray-100 rounded-lg w-28" />
              <div className="h-8 bg-gray-200 rounded-lg w-24" />
            </div>
          </div>
          {/* Table skeleton */}
          <div className="p-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['w-8', 'w-32', 'w-28', 'w-24', 'w-20', 'w-16'].map((w, i) => (
                    <th key={i} className="px-4 py-2.5 text-left">
                      <div className={`h-4 bg-gray-200 rounded ${w}`} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Array.from({ length: 4 }).map((_, rowIdx) => (
                  <tr key={rowIdx}>
                    {['w-8', 'w-32', 'w-28', 'w-24', 'w-20', 'w-16'].map((w, colIdx) => (
                      <td key={colIdx} className="px-4 py-3">
                        <div className={`h-4 bg-gray-100 rounded ${w}`} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Action bar skeleton */}
      <div className="shrink-0 sticky bottom-0 z-40 bg-white border-t border-gray-200 px-6 py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-9 bg-gray-200 rounded-lg w-20" />
          <div className="flex items-center gap-3">
            <div className="h-9 bg-gray-100 rounded-lg w-28" />
            <div className="h-9 bg-gray-200 rounded-lg w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SupportingDataMaintenanceDetailListPage() {
  const navigate = useNavigate();
  const { supportingId } = useParams<{ supportingId: string }>();
  const { t } = useTranslation(['supportingDataMaintenance', 'common']);

  // getAPI
  const {
    data: supportingData,
    isLoading,
    isError,
    error,
  } = useGetSupportingDataById(supportingId);

  /**
   * Disable when
   * 1. Status has Approved, Cancelled, Rejected
   * 2. Permission to edit is false
   * 3. Has SupportingId - path not /new
   */

  const status = supportingData?.status ?? '';

  const hasSupportingId = Boolean(supportingId); // To check allow to edit when path is /supporting-data-maintenance/new
  const hasAuthorityToEdit = supportingData?.hasAuthorityToEdit ?? false; // To check disable detail form by permissions
  const hasAuthorityToDecision = supportingData?.hasAuthorityToDecision ?? false; // To check disable decision form by permissions

  // Form
  const formDefaults = useMemo(() => {
    if (hasSupportingId && supportingData) {
      return mapSupportingDataResponseToForm(supportingData);
    }
    return defaultSupportingData;
  }, [hasSupportingId, supportingData]);

  /**
   * Submit supporting detail - staff
   * - change status to pending
   * - staff
   * If movement is forward and status is pending, view only.
   * If movement is backward and status is pending, editable.
   */
  const supportingMethods = useForm<createSupportingDataFormType>({
    resolver: zodResolver(createSupportingDataForm),
    defaultValues: formDefaults,
    mode: 'onSubmit',
  });

  /**
   * Submit supporting detail - checker staff
   * - change status to completed, cancelled, rejected and route back depend on decision.
   * - checker
   * If status is completed, cancelled, rejected, view only.
   * If movement is backward and status is pending, view only.
   * - checker can edit only decision section.
   */
  const decisionMethods = useForm<decisionFormType>({
    resolver: zodResolver(decisionForm),
    defaultValues: defaultDecision,
    mode: 'onSubmit',
  });

  const { getValues: getSupportingValues, reset: resetSupporting } = supportingMethods;

  useEffect(() => {
    if (hasSupportingId && supportingData) {
      resetSupporting(mapSupportingDataResponseToForm(supportingData));
    }
  }, [hasSupportingId, supportingData, resetSupporting]);

  const { mutateAsync: createDraftSupportingData, isPending: isCreatingDraft } =
    useCreateDraftSupportingData();
  const { mutate: updateDraftSupportingData, isPending: isUpdating } =
    useUpdateDraftSupportingData();
  const { mutate: deleteSupportingData, isPending: isDeleting } = useDeleteSupportingDetailData();
  const { mutate: submitSupportingData, isPending: isSubmitting } = useSubmitSupportingData();

  const [saveAction, setSaveAction] = useState<'draft' | 'submit' | null>(null);

  // File management (Excel bulk upload of supporting details)
  const [parseErrors, setParseErrors] = useState<RowParseError[] | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutateAsync: bulkUpload, isPending: isUploading } = useBulkUploadSupportingDetails();

  const isPending = isCreatingDraft || isUpdating || isSubmitting || isDeleting || isUploading;

  const handleFile = async (file: File) => {
    // Client-side guards (mirrors the server-side checks)
    if (!file.name.endsWith('.xlsx')) {
      toast.error(t('toasts.fileTypeError'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('toasts.fileSizeError'));
      return;
    }

    try {
      if (!hasSupportingId) {
        const supportingData = getSupportingValues();
        const { supportingId: newSupportingId } = await createDraftSupportingData(
          { data: supportingData as any },
          {
            onError: (error: any) => {
              toast.error(
                error.apiError?.detail ||
                  'Failed to create draft supporting data. Please try again.',
              );
              setSaveAction(null);
            },
          },
        );
        const result = await bulkUpload({ supportingId: newSupportingId, file });
        setParseErrors(null);

        toast.success(`${result.insertedCount} row(s) imported successfully`);
        navigate(`/standalone/supporting-data-maintenance/${newSupportingId}`);
      } else {
        const result = await bulkUpload({ supportingId, file });
        setParseErrors(null);

        toast.success(`${result.insertedCount} row(s) imported successfully`);
      }
    } catch (err: any) {
      // The server returns row-level errors in ProblemDetails.extensions.rowErrors
      const rowErrors: RowParseError[] | undefined = err?.response?.data?.rowErrors;
      if (rowErrors && rowErrors.length > 0) {
        setParseErrors(rowErrors);
        setShowErrorDialog(true);
      } else {
        toast.error(err?.response?.data?.detail ?? t('toasts.uploadFailed'));
      }
    }
  };

  const handleOpenFilePicker = () => {
    fileInputRef.current?.click();
  };

  // Local state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string | null;
  }>({
    isOpen: false,
    id: null,
  });

  // Handlers
  const onSubmitSupporting: SubmitHandler<createSupportingDataFormType> = async data => {
    setSaveAction('submit');
    submitSupportingData(
      { supportingId: supportingId, data: data as any },
      {
        onSuccess: () => {
          toast.success(t('toasts.updatedSuccess'));
          setSaveAction(null);
          navigate(`/standalone/supporting-data-maintenance`);
        },
        onError: (error: any) => {
          toast.error(error.apiError?.detail || t('toasts.updateFailed'));
          setSaveAction(null);
        },
      },
    );
  };

  const onSubmitDecision: SubmitHandler<decisionFormType> = data => {
    setSaveAction('submit');
    // Submit goes through react-hook-form so Zod validation runs first.
    console.log('Submit (decision):', data);
    if (hasSupportingId) {
      submitSupportingData(
        { supportingId: supportingId!, data: data as any },
        {
          onSuccess: () => {
            toast.success(t('toasts.updatedSuccess'));
            setSaveAction(null);
            navigate(`/standalone/supporting-data-maintenance`);
          },
          onError: (error: any) => {
            toast.error(error.apiError?.detail || t('toasts.updateFailed'));
            setSaveAction(null);
          },
        },
      );
    }
  };

  const handleFormSubmit = () => {
    if (hasAuthorityToDecision) {
      void decisionMethods.handleSubmit(onSubmitDecision)();
    } else {
      void supportingMethods.handleSubmit(onSubmitSupporting)();
    }
  };

  const handleAddSupportingDetailData = async () => {
    const values = getSupportingValues();
    // If supporting data is unsaved when "Add Item" is clicked, create a draft first to get the supportingId, then route to /:supportingId/new
    if (!hasSupportingId) {
      const { supportingId: newSupportingId } = await createDraftSupportingData(
        { data: values },
        {
          onSuccess: () => {
            toast.success(t('toasts.propertyCreatedSuccess'));
            setSaveAction(null);
          },
          onError: (error: any) => {
            toast.error(error.apiError?.detail || t('toasts.propertyCreateFailed'));
            setSaveAction(null);
          },
        },
      );
      navigate(`/standalone/supporting-data-maintenance/${newSupportingId}/data/new`);
    } else {
      navigate(`/standalone/supporting-data-maintenance/${supportingId}/data/new`);
    }
  };

  const handleSelectSupportingData = (id: string) => {
    if (id) {
      navigate(`/standalone/supporting-data-maintenance/${supportingId}/data/${id}`);
    }
  };

  const handleSaveDraft = async () => {
    setSaveAction('draft');

    const supportingDataValues = getSupportingValues();

    const payload = {
      ...supportingDataValues,
    };

    if (hasSupportingId) {
      updateDraftSupportingData(
        { supportingId: supportingId!, data: payload as any },
        {
          onSuccess: () => {
            toast.success(t('toasts.updatedSuccess'));
            setSaveAction(null);
          },
          onError: (error: any) => {
            toast.error(error.apiError?.detail || t('toasts.updateFailed'));
            setSaveAction(null);
          },
        },
      );
    } else {
      createDraftSupportingData(
        { data: payload as any },
        {
          onSuccess: data => {
            toast.success(t('toasts.createdSuccess'));
            setSaveAction(null);
            navigate(`/standalone/supporting-data-maintenance/${data.supportingId}`);
          },
          onError: (error: any) => {
            toast.error(error.apiError?.detail || t('toasts.createFailed'));
            setSaveAction(null);
          },
        },
      );
    }
  };

  const handleDeleteSupportingData = (id: string) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const confirmDelete = () => {
    if (deleteConfirm.id !== null) {
      const id = deleteConfirm.id;

      deleteSupportingData(
        { supportingId: supportingId!, id: id },
        {
          onSuccess: () => {
            toast.success(t('toasts.detailDeletedSuccess'));
          },
          onError: (error: any) => {
            toast.error(error.apiError?.detail || t('toasts.detailDeleteFailed'));
            setSaveAction(null);
          },
        },
      );
    }
    setDeleteConfirm({ isOpen: false, id: null });
  };

  // Render

  if (isLoading) {
    return <SupportingDataMaintenanceDetailListPageSkeleton />;
  }

  return (
    <div className="flex flex-col gap-4 justify-between min-h-full">
      <FormProvider {...supportingMethods}>
        <div className="flex flex-col gap-4 pr-2">
          {/* Supporting Data Maintenance (general info) */}
          <Section id="supporting-data">
            <FormCard
              title={t('formSections.supportingDataTitle')}
              subtitle={t('formSections.supportingDataSubtitle')}
              icon="clipboard-list"
              iconColor="blue"
            >
              <div className="flex-1 flex flex-col gap-6">
                <div className="grid grid-cols-12 gap-4">
                  <FormFields
                    fields={getSupportingDataFields(t)}
                    disabled={!hasAuthorityToEdit && hasSupportingId}
                  />
                </div>
              </div>
            </FormCard>
          </Section>

          {/* Remark from routedback */}
          {supportingData?.remark && (
            <Alert
              variant={status === SUPPORTING_STATUS.Approved ? 'success' : 'danger'}
              title={`Remark`}
              dismissible={false}
            >
              <p className="max-h-24 overflow-y-auto text-xs whitespace-pre-wrap">
                {supportingData.remark}
              </p>
            </Alert>
          )}

          {/* Supporting Data Details (list + card) */}
          <FormCard
            title={t('formSections.supportingDataDetailsTitle')}
            subtitle={supportingData?.remark ? `Remark: ${supportingData.remark}` : ''} // show remark when route back
            icon="file-certificate"
            iconColor="purple"
            required
            rightIcon={
              <div className="flex items-center gap-2">
                {(hasAuthorityToEdit || !hasSupportingId) && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) handleFile(f);
                        e.target.value = '';
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleOpenFilePicker}
                      disabled={isUploading || isPending}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Icon
                        style="solid"
                        name={isUploading ? 'spinner' : 'file-arrow-up'}
                        className={`size-4 ${isUploading ? 'animate-spin' : ''}`}
                      />
                      {isUploading ? 'Uploading…' : 'Import Excel'}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleAddSupportingDetailData}
                      disabled={isPending}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/80 transition-colors cursor-pointer"
                    >
                      <Icon style="solid" name="plus" className="size-4" />
                      {t('actions.addItem')}
                    </Button>
                  </>
                )}
              </div>
            }
          >
            <div className="w-full">
              <SupportingDataTable
                supportingId={supportingId}
                isReadOnly={!hasAuthorityToEdit}
                onSelectSupportingData={handleSelectSupportingData}
                onDeleteSupportingData={handleDeleteSupportingData}
              />
            </div>
          </FormCard>
        </div>
      </FormProvider>

      {/* Decision Detail */}
      {hasAuthorityToDecision && (
        <FormProvider {...decisionMethods}>
          <div className="flex flex-col gap-4 pr-2">
            <Section id="supporting-data-decision">
              <FormCard
                title={t('formSections.decisionTitle')}
                subtitle=""
                icon="paper-plane"
                iconColor="blue"
              >
                <div className="flex-1 flex flex-col gap-6">
                  <div className="grid grid-cols-12 gap-4">
                    <FormFields fields={getDecisionFields(t)} />
                  </div>
                </div>
              </FormCard>
            </Section>
          </div>
        </FormProvider>
      )}

      {/* Action panel (Save Draft / Submit)             */}
      <ActionBar>
        <ActionBar.Left>
          <CancelButton fallbackPath="/standalone/supporting-data-maintenance" />
        </ActionBar.Left>
        <ActionBar.Right>
          {(hasAuthorityToEdit || !hasSupportingId) && (
            <Button
              variant="ghost"
              type="button"
              onClick={() => handleSaveDraft()}
              isLoading={isPending && saveAction === 'draft'}
              disabled={isPending}
            >
              <Icon name="floppy-disk" style="regular" className="size-4 mr-2" />
              {t('actions.saveDraft')}
            </Button>
          )}
          {(hasAuthorityToEdit || hasAuthorityToDecision || !hasSupportingId) && (
            <Button
              type="button"
              onClick={() => handleFormSubmit()}
              isLoading={isPending && saveAction === 'submit'}
              leftIcon={<Icon name="check" style="solid" className="size-4" />}
              disabled={isPending}
            >
              {t('actions.submit')}
            </Button>
          )}
        </ActionBar.Right>
      </ActionBar>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={confirmDelete}
        title={t('confirm.deleteTitle')}
        message={t('confirm.deleteMessage')}
        confirmText={t('common:actions.delete')}
        cancelText={t('common:actions.cancel')}
        variant="danger"
      />

      {/* Bulk upload row-error dialog */}
      {parseErrors && (
        <BulkUploadDialog
          isOpen={showErrorDialog}
          onClose={() => setShowErrorDialog(false)}
          errors={parseErrors}
        />
      )}
    </div>
  );
}
