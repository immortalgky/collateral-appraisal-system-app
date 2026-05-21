import {
  useForm,
  FormProvider,
  useWatch,
  useFieldArray,
  type SubmitHandler,
} from 'react-hook-form';
import {
  createSupportingDataForm,
  defaultSupportingData,
  defaultSupportingDataDetail,
  type createSupportingDataFormType,
} from '../schemas/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ActionBar, Button, CancelButton, FormCard, Icon, Section } from '@/shared/components';
import { useRef, useState } from 'react';
import { FormFields, useFormReadOnly } from '@/shared/components/form';
import clsx from 'clsx';
import {
  contactInformationFields,
  financialDetailsFields,
  locationDetailFields,
  propertyInformationFields,
  sourceAndReferenceFields,
  supportingDataFields,
} from '../configs/fields';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import toast from 'react-hot-toast';
import { SupportingDataCard } from '../components/SupportingDataCard';
import { SupportingDataTable } from '../components/SupportingDataTable';
import { parseSupportingDataExcel, type InvalidRow } from '../utils/parseSupportingDataExcel';
import { SupportingDataMaintenanceDetailForm } from '../components/SupportingDataMaintenanceDetailForm';

type ParseRowError = InvalidRow;

export function SupportingDataMaintenanceDetailPage() {
  const isReadOnly = useFormReadOnly();

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

    try {
      const { valid, invalid } = await parseSupportingDataExcel(file);

      if (valid.length > 0) {
        // useFieldArray.append supports bulk append; rows arrive with the
        // same shape as defaultSupportingDataDetail so RHF accepts them.
        append(valid);
      }

      if (invalid.length > 0) {
        setParseErrors(invalid);
        toast.error(
          `Imported ${valid.length} row(s); ${invalid.length} skipped due to validation errors.`,
        );
      } else if (valid.length > 0) {
        toast.success(`Imported ${valid.length} row(s).`);
      } else {
        toast.error('No rows were imported.');
      }
    } catch (e) {
      toast.error(
        e instanceof Error
          ? `Failed to parse Excel file: ${e.message}`
          : 'Failed to parse Excel file.',
      );
    }
  };

  const handleOpenFilePicker = () => {
    fileInputRef.current?.click();
  };

  // ------------------------------------------------------------------
  // Form
  // ------------------------------------------------------------------
  const methods = useForm<createSupportingDataFormType>({
    resolver: zodResolver(createSupportingDataForm),
    defaultValues: defaultSupportingData,
    mode: 'onSubmit',
  });
  const { handleSubmit, control, getValues, trigger } = methods;

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'supportingDataDetails',
  });
  const supportingDataDetails = useWatch({ name: 'supportingDataDetails', control }) ?? [];

  // ------------------------------------------------------------------
  // Local state — list vs. card mode + delete confirmation
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
    const newIndex = fields.length;
    append({ ...defaultSupportingDataDetail });
    setEditIndex(newIndex);
  };

  const handleSelectSupportingData = (index: number) => {
    setEditIndex(index);
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
  // Submit / Save Draft
  // ------------------------------------------------------------------
  const onSubmit: SubmitHandler<createSupportingDataFormType> = data => {
    // Submit goes through react-hook-form so Zod validation runs first.
    console.log('Submit:', data);
    // TODO: call submit API
  };

  const handleInvalidSubmit = () => {
    toast.error('Please fix the highlighted fields before submitting.');
  };

  const handleSaveDraft = async () => {
    // Save draft skips validation by reading values directly.
    const data = getValues();
    console.log('Save draft:', data);
    // TODO: call save-draft API
    toast.success('Draft saved');
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(onSubmit, handleInvalidSubmit)}
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
            subtitle={
              isEditing
                ? `Editing Supporting Data ${(editIndex as number) + 1}`
                : `${fields.length} item${fields.length === 1 ? '' : 's'}`
            }
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
            {/* Show inline parse errors from Excel import (if any) */}
            {parseErrors && parseErrors.length > 0 && (
              <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                <p className="font-medium mb-1">
                  {parseErrors.length} row(s) skipped during import:
                </p>
                <ul className="list-disc list-inside space-y-0.5">
                  {parseErrors.slice(0, 5).map(err => (
                    <li key={err.row}>
                      Row {err.row}: {err.errors.join('; ')}
                    </li>
                  ))}
                  {parseErrors.length > 5 && <li>...and {parseErrors.length - 5} more</li>}
                </ul>
              </div>
            )}

            {isEditing ? (
              /* ---------- Edit mode: card list (left) + form (right) ---------- */
              <div className="flex gap-4">
                {/* Left: card list (sticky) */}
                <div className="w-44 shrink-0 border-r border-gray-100 pr-4 sticky top-0 self-start">
                  <div
                    ref={listContainerRef}
                    className="overflow-y-auto overflow-x-visible max-h-[calc(100vh-20rem)]"
                  >
                    <div className="flex flex-col gap-2 pr-1 pt-1 pl-1">
                      {fields.map((data, index) => {
                        const isComplete = isSupportingDataComplete(index);
                        return (
                          <SupportingDataCard
                            key={data.id}
                            index={index}
                            isSelected={editIndex === index}
                            isCompleted={isComplete}
                            isReadOnly={isReadOnly}
                            data={supportingDataDetails[index] ?? data}
                            onSelectSupportingData={() => handleSelectSupportingData(index)}
                            onDeleteSupportingData={() => handleDeleteSupportingData(index)}
                          />
                        );
                      })}
                    </div>

                    {!isReadOnly && (
                      <div className="pt-2 mt-2 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={handleAddSupportingData}
                          className="w-full flex items-center gap-2 p-2 rounded-lg border border-dashed border-gray-200 text-gray-500 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200">
                            <Icon style="solid" name="plus" className="size-3.5" />
                          </div>
                          <span className="text-xs font-medium">Add Item</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: detail form */}
                <div className="flex-1 min-w-0">
                  <SupportingDataMaintenanceDetailForm editIndex={editIndex as number} />
                </div>
              </div>
            ) : (
              /* ---------- List mode: full-width table ---------- */
              <div className="w-full">
                <SupportingDataTable
                  supportingDetails={supportingDataDetails}
                  isReadOnly={isReadOnly}
                  onSelectSupportingData={handleSelectSupportingData}
                  onDeleteSupportingData={handleDeleteSupportingData}
                />
              </div>
            )}
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
                leftIcon={<Icon name="floppy-disk" style="regular" className="size-4" />}
              >
                Save Draft
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
