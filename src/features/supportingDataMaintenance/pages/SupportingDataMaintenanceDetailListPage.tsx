import { useForm, FormProvider, type SubmitHandler } from 'react-hook-form';
import {
  createSupportingDataForm,
  defaultSupportingData,
  type createSupportingDataFormType,
} from '../schemas/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ActionBar, Button, CancelButton, FormCard, Icon, Section } from '@/shared/components';
import { useRef, useState } from 'react';
import { FormFields, useFormReadOnly } from '@/shared/components/form';
import { supportingDataFields } from '../configs/fields';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import toast from 'react-hot-toast';
import { SupportingDataTable } from '../components/SupportingDataTable';
import { supportingDataDetailPreviewList } from '../constants/mockData';
import { useNavigate } from 'react-router-dom';

interface ParseRowError {
  row: number;
  field: string;
  value: string;
  reason: string;
}

export function SupportingDataMaintenanceDetailListPage() {
  const isReadOnly = useFormReadOnly();
  const navigate = useNavigate();

  // ------------------------------------------------------------------
  // Form
  // ------------------------------------------------------------------
  const methods = useForm<createSupportingDataFormType>({
    resolver: zodResolver(createSupportingDataForm),
    defaultValues: defaultSupportingData,
    mode: 'onSubmit',
  });
  const {
    handleSubmit,
    getValues,
    formState: { dirtyFields },
  } = methods;

  // ------------------------------------------------------------------
  // File management (Excel upload of supporting data)
  // ------------------------------------------------------------------
  const [parseErrors, setParseErrors] = useState<ParseRowError[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.xlsx')) {
      toast.error('Only .xlsx files are accepted');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be ≤ 5 MB');
      return;
    }
    setParseErrors(null);
  };

  const handleOpenFilePicker = () => {
    fileInputRef.current?.click();
  };

  // ------------------------------------------------------------------
  // Submit
  // ------------------------------------------------------------------
  const onSubmit: SubmitHandler<createSupportingDataFormType> = data => {
    // Submit goes through react-hook-form so Zod validation runs first.
    console.log('Submit:', data);
    // TODO: call submit API
  };

  // ------------------------------------------------------------------
  // Local state
  // ------------------------------------------------------------------
  const [editIndex, setEditIndex] = useState<number | undefined>();
  const isEditing = editIndex !== undefined;

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    index: number | null;
  }>({
    isOpen: false,
    index: null,
  });

  const listContainerRef = useRef<HTMLDivElement>(null);

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------
  const handleAddSupportingData = () => {
    // const newIndex = fields.length;
    // append({ ...defaultSupportingDataDetail });
    // setEditIndex(newIndex);
  };

  const handleSelectSupportingData = (index: number) => {
    // setEditIndex(index);
    if (index) {
      navigate(`/standalone/supporting-data-maintenance/0/${index}`);
    }
  };

  const handleSaveDraft = async () => {
    // Save draft skips validation by reading values directly.
    const data = getValues();
    console.log('Save draft:', data);
    // TODO: call save-draft API
    toast.success('Draft saved');
  };

  const handleBackToList = () => {
    setEditIndex(undefined);
  };

  const handleDeleteSupportingData = (index: number) => {
    setDeleteConfirm({ isOpen: true, index });
  };

  const confirmDelete = () => {
    if (deleteConfirm.index !== null) {
      const index = deleteConfirm.index;
      remove(index);
      if (editIndex === index) {
        setEditIndex(undefined);
      } else if (editIndex !== undefined && editIndex > index) {
        setEditIndex(editIndex - 1);
      }
    }
    setDeleteConfirm({ isOpen: false, index: null });
  };

  // Check if a single detail row passes validation. We re-use the global
  // schema and rely on safeParse on the row shape; the schema is built from
  // the same field configs that drive this form.
  const isSupportingDataComplete = (index: number): boolean => {
    const row = supportingDataDetails[index];
    if (!row) return false;
    const detailSchema = (createSupportingDataForm as any)?.shape?.supportingDataDetails?._def
      ?.type;
    if (detailSchema?.safeParse) {
      return detailSchema.safeParse(row).success;
    }
    // Fallback: required fields per field config
    return Boolean(
      row.collateralType &&
        row.subDistrict &&
        row.latitude != null &&
        row.longitude != null &&
        row.informationDate,
    );
  };

  // ------------------------------------------------------------------
  // Api
  // ------------------------------------------------------------------
  // 1. enrich suppoting data
  const previewList = supportingDataDetailPreviewList;

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4 justify-between min-h-full"
        noValidate
      >
        <div className="flex flex-col gap-4 pr-2">
          {/* --------------------------------------------------------- */}
          {/* Section 1 — Supporting Data Maintenance (general info)    */}
          {/* --------------------------------------------------------- */}
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

          {/* --------------------------------------------------------- */}
          {/* Section 2 — Supporting Data Details (list + card)          */}
          {/* --------------------------------------------------------- */}
          <FormCard
            title="Supporting Data Details"
            subtitle={''}
            icon="file-certificate"
            iconColor="purple"
            required
            rightIcon={
              <div className="flex items-center gap-2">
                {/* Hidden file input + visible trigger button */}
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

                {!isReadOnly && !isEditing && (
                  <button
                    type="button"
                    onClick={handleOpenFilePicker}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    <Icon style="solid" name="file-arrow-up" className="size-4" />
                    Import Excel
                  </button>
                )}

                {isEditing ? (
                  <button
                    type="button"
                    onClick={handleBackToList}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    <Icon style="solid" name="arrow-left" className="size-4" />
                    Back to List
                  </button>
                ) : !isReadOnly ? (
                  <button
                    type="button"
                    onClick={handleAddSupportingData}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/80 transition-colors cursor-pointer"
                  >
                    <Icon style="solid" name="plus" className="size-4" />
                    Add Item
                  </button>
                ) : null}
              </div>
            }
          >
            <div className="w-full">
              <SupportingDataTable
                supportingDetails={previewList}
                isReadOnly={isReadOnly}
                onSelectSupportingData={handleSelectSupportingData}
                onDeleteSupportingData={handleDeleteSupportingData}
              />
            </div>
          </FormCard>
        </div>

        {/* --------------------------------------------------------- */}
        {/* Section 3 — Action panel (Save Draft / Submit)             */}
        {/* --------------------------------------------------------- */}
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
                // isLoading={isPending && saveAction === 'draft'}
                // disabled={isPending}
              >
                <Icon name="floppy-disk" style="regular" className="size-4 mr-2" />
                Save draft
              </Button>
              <Button
                type="submit"
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
          onClose={() => setDeleteConfirm({ isOpen: false, index: null })}
          onConfirm={confirmDelete}
          title="Delete Supporting Data"
          message="Are you sure you want to delete this item? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
        />
      </form>
    </FormProvider>
  );
}
