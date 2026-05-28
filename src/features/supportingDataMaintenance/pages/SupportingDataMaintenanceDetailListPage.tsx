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
import { ActionBar, Button, CancelButton, FormCard, Icon, Section } from '@/shared/components';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { FormFields } from '@/shared/components/form';
import { decisionFields, supportingDataFields } from '../configs/fields';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import toast from 'react-hot-toast';
import { SupportingDataTable } from '../components/SupportingDataTable';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useCreateDraftSupportingData,
  useCreateSupportingData,
  useDeleteSupportingDetailData,
  useGetSupportingDataById,
  useSubmitSupportingData,
  useUpdateDraftSupportingData,
  useBulkUploadSupportingDetails,
} from '../api';
import { BulkUploadDialog, type RowParseError } from '../components/BulkUploadDialog';
import { mapSupportingDataResponseToForm } from '../utils/mapper';
import { ARCHIVED_STATUSES } from '../constants/parameters';

export function SupportingDataMaintenanceDetailListPage() {
  const navigate = useNavigate();
  const { supportingId } = useParams<{ supportingId: string }>();

  // getAPI
  const {
    data: supportingData,
    isLoading,
    isError,
    error,
  } = useGetSupportingDataById(supportingId);

  const status = supportingData?.status ?? '';
  const isReadOnly = ARCHIVED_STATUSES.has(status);

  const hasAuthorityToEdit = supportingData?.hasAuthorityToEdit ?? false; // Status to check user has authority to edit detail header info (general info secton).
  const hasAuthorityToDecision = supportingData?.hasAuthorityToDecision ?? false; // Status to check user has authority to make decision (decision section);

  // Form
  const isEditMode = Boolean(supportingId);

  const formDefaults = useMemo(() => {
    if (isEditMode && supportingData) {
      return mapSupportingDataResponseToForm(supportingData);
    }
    return defaultSupportingData;
  }, [isEditMode, supportingData]);

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
    if (isEditMode && supportingData) {
      resetSupporting(mapSupportingDataResponseToForm(supportingData));
    }
  }, [isEditMode, supportingData, resetSupporting]);

  const { mutateAsync: createSupportingData, isPending: isCreating } = useCreateSupportingData();
  const { mutateAsync: createDraftSupportingData, isPending: isCreatingDraft } =
    useCreateDraftSupportingData();
  const { mutate: updateDraftSupportingData, isPending: isUpdating } =
    useUpdateDraftSupportingData();
  const { mutate: deleteSupportingData, isPending: isDeleting } = useDeleteSupportingDetailData();
  const { mutate: submitSupportingData, isPending: isSubmitting } = useSubmitSupportingData();

  const [saveAction, setSaveAction] = useState<'draft' | 'submit' | null>(null);
  const isPending =
    isCreating || isUpdating || isCreatingDraft || isUpdating || isSubmitting || isDeleting;

  // File management (Excel bulk upload of supporting details)
  const [parseErrors, setParseErrors] = useState<RowParseError[] | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutateAsync: bulkUpload, isPending: isUploading } = useBulkUploadSupportingDetails();

  const handleFile = async (file: File) => {
    // Client-side guards (mirrors the server-side checks)
    if (!file.name.endsWith('.xlsx')) {
      toast.error('Only .xlsx files are accepted');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be ≤ 5 MB');
      return;
    }

    if (!supportingId) {
      toast.error('Please save the form first before uploading.');
      return;
    }

    try {
      setParseErrors(null);
      const result = await bulkUpload({ supportingId, file });
      toast.success(`${result.insertedCount} row(s) imported successfully`);
    } catch (err: any) {
      // The server returns row-level errors in ProblemDetails.extensions.rowErrors
      const rowErrors: RowParseError[] | undefined = err?.response?.data?.rowErrors;
      if (rowErrors && rowErrors.length > 0) {
        setParseErrors(rowErrors);
        setShowErrorDialog(true);
      } else {
        toast.error(err?.response?.data?.detail ?? 'Upload failed. Please try again.');
      }
    }
  };

  const handleOpenFilePicker = () => {
    fileInputRef.current?.click();
  };

  // Local state
  const [editIndex, setEditIndex] = useState<number | undefined>();
  const isEditing = editIndex !== undefined;

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string | null;
  }>({
    isOpen: false,
    id: null,
  });

  const listContainerRef = useRef<HTMLDivElement>(null);

  // Handlers
  const onSubmitSupporting: SubmitHandler<createSupportingDataFormType> = async data => {
    setSaveAction('submit');
    // Submit goes through react-hook-form so Zod validation runs first.
    console.log('Submit (supporting):', data);
    if (isEditMode) {
      submitSupportingData(
        { supportingId: supportingId!, data: data as any },
        {
          onSuccess: () => {
            toast.success('Supporting data submitted successfully');
            setSaveAction(null);
            navigate(`/standalone/supporting-data-maintenance`);
          },
          onError: (error: any) => {
            toast.error(
              error.apiError?.detail || 'Failed to submit supporting data. Please try again.',
            );
            setSaveAction(null);
          },
        },
      );
    } else {
      const { supportingId: newId } = await createSupportingData({ data });
      console.log('Created supporting data with ID:', newId);
      submitSupportingData(
        { supportingId: newId!, data: data as any },
        {
          onSuccess: () => {
            toast.success('Supporting data submitted successfully');
            setSaveAction(null);
            navigate(`/standalone/supporting-data-maintenance`);
          },
          onError: (error: any) => {
            toast.error(
              error.apiError?.detail || 'Failed to submit supporting data. Please try again.',
            );
            setSaveAction(null);
          },
        },
      );
    }
  };

  const onSubmitDecision: SubmitHandler<decisionFormType> = data => {
    setSaveAction('submit');
    // Submit goes through react-hook-form so Zod validation runs first.
    console.log('Submit (decision):', data);
    if (isEditMode) {
      submitSupportingData(
        { supportingId: supportingId!, data: data as any },
        {
          onSuccess: () => {
            toast.success('Supporting data submitted successfully');
            setSaveAction(null);
            navigate(`/standalone/supporting-data-maintenance`);
          },
          onError: (error: any) => {
            toast.error(
              error.apiError?.detail || 'Failed to submit supporting data. Please try again.',
            );
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
    if (!isEditMode) {
      const { supportingId: newSupportingId } = await createDraftSupportingData(
        { data: values },
        {
          onSuccess: () => {
            toast.success('Property supporting data created successfully');
            setSaveAction(null);
          },
          onError: (error: any) => {
            toast.error(
              error.apiError?.detail || 'Failed to create supporting data. Please try again.',
            );
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
    // Save draft skips validation by reading values directly.
    const supportingData = getSupportingValues();
    const decisionData = hasAuthorityToDecision ? decisionMethods.getValues() : null;
    console.log('Save draft:', { supportingData, decisionData });
    if (isEditMode) {
      updateDraftSupportingData(
        { supportingId: supportingId!, data: supportingData as any },
        {
          onSuccess: () => {
            toast.success('Draft supporting data updated successfully');
            setSaveAction(null);
          },
          onError: (error: any) => {
            toast.error(
              error.apiError?.detail || 'Failed to update draft supporting data. Please try again.',
            );
            setSaveAction(null);
          },
        },
      );
    } else {
      createDraftSupportingData(
        { data: supportingData as any },
        {
          onSuccess: data => {
            toast.success('Draft supporting data created successfully');
            setSaveAction(null);
            navigate(`/standalone/supporting-data-maintenance/${data.supportingId}`);
          },
          onError: (error: any) => {
            toast.error(
              error.apiError?.detail || 'Failed to create draft supporting data. Please try again.',
            );
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
            toast.success('Supporting data detail deleted successfully');
          },
          onError: (error: any) => {
            toast.error(
              error.apiError?.detail ||
                'Failed to delete supporting data detail. Please try again.',
            );
            setSaveAction(null);
          },
        },
      );
    }
    setDeleteConfirm({ isOpen: false, id: null });
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  if (isLoading) {
    return <>Loading...</>; // improve with skeleton UI
  }

  return (
    <div className="flex flex-col gap-4 justify-between min-h-full">
      <FormProvider {...supportingMethods}>
        <div className="flex flex-col gap-4 pr-2">
          {/* Section 1 — Supporting Data Maintenance (general info)    */}
          <Section id="supporting-data">
            <FormCard
              title="Supporting Data Maintenance"
              subtitle="General information for this batch of supporting data"
              icon="clipboard-list"
              iconColor="blue"
            >
              <div className="flex-1 flex flex-col gap-6">
                <div className="grid grid-cols-12 gap-4">
                  <FormFields fields={supportingDataFields} />
                </div>
              </div>
            </FormCard>
          </Section>

          {/* Section 2 — Supporting Data Details (list + card)          */}
          <FormCard
            title="Supporting Data Details"
            subtitle={supportingData?.remark ? `Remark: ${supportingData.remark}` : ''} // show remark when route back
            icon="file-certificate"
            iconColor="purple"
            required
            rightIcon={
              <div className="flex items-center gap-2">
                {/* Hidden file input + visible trigger button */}
                {!isReadOnly && !isEditing && !hasAuthorityToDecision && (
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
                    <button
                      type="button"
                      onClick={handleOpenFilePicker}
                      disabled={isUploading}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Icon
                        style="solid"
                        name={isUploading ? 'spinner' : 'file-arrow-up'}
                        className={`size-4 ${isUploading ? 'animate-spin' : ''}`}
                      />
                      {isUploading ? 'Uploading…' : 'Import Excel'}
                    </button>
                    <button
                      type="button"
                      onClick={handleAddSupportingDetailData}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/80 transition-colors cursor-pointer"
                    >
                      <Icon style="solid" name="plus" className="size-4" />
                      Add Item
                    </button>
                  </>
                )}
              </div>
            }
          >
            <div className="w-full">
              <SupportingDataTable
                supportingId={supportingId}
                isReadOnly={isReadOnly}
                onSelectSupportingData={handleSelectSupportingData}
                onDeleteSupportingData={handleDeleteSupportingData}
              />
            </div>
          </FormCard>
        </div>
      </FormProvider>

      {/* Section 3 - Decision Detail */}
      {hasAuthorityToDecision && !ARCHIVED_STATUSES.has(status) && (
        <FormProvider {...decisionMethods}>
          <div className="flex flex-col gap-4 pr-2">
            <Section id="supporting-data-decision">
              <FormCard title="Decision" subtitle="" icon="paper-plane" iconColor="blue">
                <div className="flex-1 flex flex-col gap-6">
                  <div className="grid grid-cols-12 gap-4">
                    <FormFields fields={decisionFields} />
                  </div>
                </div>
              </FormCard>
            </Section>
          </div>
        </FormProvider>
      )}

      {/* Section 4 — Action panel (Save Draft / Submit)             */}
      <ActionBar>
        <ActionBar.Left>
          <CancelButton fallbackPath="/standalone/supporting-data-maintenance" />
        </ActionBar.Left>
        {!isReadOnly && (
          <ActionBar.Right>
            <Button
              variant="ghost"
              type="button"
              onClick={handleSaveDraft}
              isLoading={isPending && saveAction === 'draft'}
              disabled={isPending}
            >
              <Icon name="floppy-disk" style="regular" className="size-4 mr-2" />
              Save draft
            </Button>
            <Button
              type="button"
              onClick={() => handleFormSubmit()}
              isLoading={isPending && saveAction === 'submit'}
              leftIcon={<Icon name="check" style="solid" className="size-4" />}
            >
              Submit
            </Button>
          </ActionBar.Right>
        )}
      </ActionBar>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={confirmDelete}
        title="Delete Supporting Detail"
        message="Are you sure you want to delete this item? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
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
