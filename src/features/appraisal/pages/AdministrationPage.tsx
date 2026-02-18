import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RadioGroup as HeadlessRadioGroup } from '@headlessui/react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import FormCard from '@/shared/components/sections/FormCard';
import { useDisclosure } from '@/shared/hooks/useDisclosure';

import { useCreateAssignment, useGetAssignment, useGetCompanyById, useGetUserById, } from '../api/administration';
import { assignmentFormDefaults, assignmentFormSchema, type AssignmentFormType, } from '../schemas/administration';
import type { ExternalCompany, InternalStaff } from '../types/administration';

import SearchStaffModal from '../components/SearchStaffModal';
import SearchCompanyModal from '../components/SearchCompanyModal';
import StaffDisplay from '../components/StaffDisplay';
import CompanyDisplay from '../components/CompanyDisplay';
import QuotationSection from '../components/QuotationSection';
import AddToQuotationModal from '../components/AddToQuotationModal';
import CreateQuotationModal from '../components/CreateQuotationModal';
import { useAuthStore } from '@features/auth/store.ts';
import { mapAssignmentResponseToForm } from '@features/appraisal/utils/mappers.ts';

const AdministrationPage = () => {
  const { appraisalId } = useParams<{ appraisalId: string }>();
  const currentUser = useAuthStore(state => state.user);

  // API hooks
  const { data: assignments, isLoading: isLoadingAssignment } = useGetAssignment(appraisalId ?? '');
  const currentAssignment = assignments?.[0] ?? null;
  const isReadOnly =
    !!currentAssignment && currentAssignment.assignmentStatus.toLowerCase() !== 'pending';
  const { mutate: createAssignment, isPending: isCreating } = useCreateAssignment();

  // Fetch assigned staff/company by ID for display
  const { data: assignedStaff } = useGetUserById(currentAssignment?.assigneeUserId ?? null);
  const { data: assignedCompany } = useGetCompanyById(currentAssignment?.assigneeCompanyId ?? null);
  const { data: followupStaff } = useGetUserById(currentAssignment?.internalAppraiserId ?? null);

  // Form setup
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<AssignmentFormType>({
    defaultValues: assignmentFormDefaults,
    resolver: zodResolver(assignmentFormSchema),
  });

  console.log(errors);

  // Watch form values for conditional rendering
  const assignmentType = watch('assignmentType');
  const assignmentMethod = watch('assignmentMethod');
  const selectedStaff = watch('selectedStaff');
  const selectedCompany = watch('selectedCompany');
  const selectedFollowupStaff = watch('selectedFollowupStaff');

  // Modal states
  const {
    isOpen: isStaffModalOpen,
    onOpen: openStaffModal,
    onClose: closeStaffModal,
  } = useDisclosure();

  const {
    isOpen: isCompanyModalOpen,
    onOpen: openCompanyModal,
    onClose: closeCompanyModal,
  } = useDisclosure();

  const {
    isOpen: isAddToQuotationModalOpen,
    onOpen: openAddToQuotationModal,
    onClose: closeAddToQuotationModal,
  } = useDisclosure();

  const {
    isOpen: isCreateQuotationModalOpen,
    onOpen: openCreateQuotationModal,
    onClose: closeCreateQuotationModal,
  } = useDisclosure();

  const {
    isOpen: isFollowupStaffModalOpen,
    onOpen: openFollowupStaffModal,
    onClose: closeFollowupStaffModal,
  } = useDisclosure();

  // Handle staff selection
  const handleStaffSelect = (staff: InternalStaff) => {
    setValue('selectedStaff', staff, { shouldDirty: true });
    setValue('staffId', staff.id, { shouldDirty: true });
  };

  // Handle company selection
  const handleCompanySelect = (company: ExternalCompany) => {
    setValue('selectedCompany', company, { shouldDirty: true });
    setValue('companyId', company.id, { shouldDirty: true });
  };

  // Handle followup staff selection
  const handleFollowupStaffSelect = (staff: InternalStaff) => {
    setValue('selectedFollowupStaff', staff, { shouldDirty: true });
    setValue('followupStaffId', staff.id, { shouldDirty: true });
  };

  // Clear selections when user manually changes assignment type
  const handleAssignmentTypeChange = (value: string, fieldOnChange: (value: string) => void) => {
    fieldOnChange(value);
    setValue('selectedStaff', null);
    setValue('staffId', null);
    setValue('selectedCompany', null);
    setValue('companyId', null);
    setValue('assignmentMethod', 'manual');
    if (value === 'internal') {
      setValue('selectedFollowupStaff', null);
      setValue('followupStaffId', null);
    }
  };

  // Update form when data is fetched
  useEffect(() => {
    if (currentAssignment) {
      const formValues = mapAssignmentResponseToForm(currentAssignment);
      reset({
        ...formValues,
        selectedStaff: assignedStaff ?? null,
        selectedCompany: assignedCompany ?? null,
        selectedFollowupStaff: followupStaff ?? null,
      });
    }
  }, [
    reset,
    isLoadingAssignment,
    currentAssignment,
    assignedStaff,
    assignedCompany,
    followupStaff,
  ]);

  // Handle form submission
  const onSubmit = (data: AssignmentFormType) => {
    if (!appraisalId) return;

    createAssignment(
      {
        appraisalId: appraisalId ?? '',
        assignmentType:
          data.assignmentMethod === 'quotation'
            ? 'Quotation'
            : data.assignmentType === 'internal'
              ? 'Internal'
              : 'External',
        assigneeUserId: data.assignmentType === 'internal' ? data.staffId : null,
        assigneeCompanyId: data.assignmentType === 'external' ? data.companyId : null,
        assignmentMethod: data.assignmentMethod,
        internalAppraiserId: data.assignmentType === 'external' ? data.followupStaffId : null,
        assignedBy: currentUser?.username,
      },
      {
        onSuccess: () => {
          toast.success('Assignment created successfully');
        },
        onError: (error: any) => {
          toast.error(error.apiError?.detail || 'Failed to create assignment. Please try again.');
        },
      },
    );
  };

  // Handle cancel
  const handleCancel = () => {
    reset(assignmentFormDefaults);
  };

  if (isLoadingAssignment) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="spinner" style="solid" className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Main Form Content */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="flex flex-col gap-6 pb-6 pr-4">
            {/* Assignment Type Card */}
            <FormCard
              title="Assignment Type"
              subtitle="Select whether to assign internally or to an external company"
              icon="users-gear"
              iconColor="blue"
            >
              <Controller
                name="assignmentType"
                control={control}
                render={({ field }) => (
                  <HeadlessRadioGroup
                    value={field.value}
                    onChange={(value: string) => handleAssignmentTypeChange(value, field.onChange)}
                    className="flex flex-row gap-4"
                    disabled={isReadOnly}
                  >
                    {[
                      {
                        value: 'internal',
                        label: 'Internal Appraisal',
                        description: 'Assign to internal appraisal staff',
                        icon: 'user',
                        color: 'emerald',
                      },
                      {
                        value: 'external',
                        label: 'External Company',
                        description: 'Assign to external appraisal company',
                        icon: 'building',
                        color: 'purple',
                      },
                    ].map(option => (
                      <HeadlessRadioGroup.Option
                        key={option.value}
                        value={option.value}
                        className={({ checked, disabled }) =>
                          clsx(
                            'flex-1 rounded-xl border-2 p-4 transition-all',
                            disabled ? 'pointer-events-none opacity-60' : 'cursor-pointer',
                            checked
                              ? `border-${option.color}-500 bg-${option.color}-50`
                              : 'border-gray-200 hover:border-gray-300 bg-white',
                          )
                        }
                      >
                        {({ checked }) => (
                          <div className="flex items-start gap-3">
                            <div
                              className={clsx(
                                'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                                checked ? `bg-${option.color}-200` : 'bg-gray-100',
                              )}
                            >
                              <Icon
                                name={option.icon}
                                style="solid"
                                className={clsx(
                                  'w-5 h-5',
                                  checked ? `text-${option.color}-600` : 'text-gray-400',
                                )}
                              />
                            </div>
                            <div className="flex-1">
                              <div
                                className={clsx(
                                  'text-sm font-medium',
                                  checked ? 'text-gray-900' : 'text-gray-700',
                                )}
                              >
                                {option.label}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {option.description}
                              </div>
                            </div>
                            {checked && (
                              <Icon
                                name="circle-check"
                                style="solid"
                                className={`w-5 h-5 text-${option.color}-500`}
                              />
                            )}
                          </div>
                        )}
                      </HeadlessRadioGroup.Option>
                    ))}
                  </HeadlessRadioGroup>
                )}
              />
              {errors.assignmentType && (
                <p className="mt-2 text-sm text-danger">{errors.assignmentType.message}</p>
              )}
            </FormCard>

            {/* Assignment Details Card */}
            <FormCard
              title={
                assignmentType === 'internal'
                  ? 'Internal Assignment Details'
                  : 'External Assignment Details'
              }
              subtitle="Configure assignment method and select assignee"
              icon={assignmentType === 'internal' ? 'user' : 'building'}
              iconColor={assignmentType === 'internal' ? 'emerald' : 'purple'}
            >
              {/* Assignment Method */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Assignment Method
                </label>
                <Controller
                  name="assignmentMethod"
                  control={control}
                  render={({ field }) => {
                    // Define options based on assignment type
                    const baseOptions = [
                      {
                        value: 'manual',
                        label: 'Manual Selection',
                        description: 'Select specific assignee',
                        icon: 'hand-pointer',
                      },
                      {
                        value: 'roundrobin',
                        label: 'Round-robin',
                        description: 'System auto-assigns based on workload',
                        icon: 'rotate',
                      },
                    ];

                    // Add quotation option for external only
                    const options =
                      assignmentType === 'external'
                        ? [
                            ...baseOptions,
                            {
                              value: 'quotation',
                              label: 'Request Quotation',
                              description: 'Request quotation from company first',
                              icon: 'file-invoice-dollar',
                            },
                          ]
                        : baseOptions;

                    // Use purple for external, primary for internal
                    const isExternal = assignmentType === 'external';

                    return (
                      <HeadlessRadioGroup
                        value={field.value}
                        onChange={field.onChange}
                        className={clsx('grid gap-3', isExternal ? 'grid-cols-3' : 'grid-cols-2')}
                        disabled={isReadOnly}
                      >
                        {options.map(option => (
                          <HeadlessRadioGroup.Option
                            key={option.value}
                            value={option.value}
                            className={({ checked, disabled }) =>
                              clsx(
                                'rounded-lg border p-3 transition-all',
                                disabled ? 'pointer-events-none opacity-60' : 'cursor-pointer',
                                checked
                                  ? isExternal
                                    ? 'border-purple-500 bg-purple-50'
                                    : 'border-emerald-500 bg-emerald-50'
                                  : 'border-gray-200 hover:border-gray-300',
                              )
                            }
                          >
                            {({ checked }) => (
                              <div className="flex items-center gap-3">
                                <Icon
                                  name={option.icon}
                                  style={checked ? 'solid' : 'regular'}
                                  className={clsx(
                                    'w-4 h-4 shrink-0',
                                    checked
                                      ? isExternal
                                        ? 'text-purple-600'
                                        : 'text-emerald-600'
                                      : 'text-gray-400',
                                  )}
                                />
                                <div className="flex-1 min-w-0">
                                  <div
                                    className={clsx(
                                      'text-sm font-medium',
                                      checked ? 'text-gray-900' : 'text-gray-600',
                                    )}
                                  >
                                    {option.label}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate">
                                    {option.description}
                                  </div>
                                </div>
                                <div
                                  className={clsx(
                                    'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                                    checked
                                      ? isExternal
                                        ? 'border-purple-500'
                                        : 'border-emerald-500'
                                      : 'border-gray-300',
                                  )}
                                >
                                  {checked && (
                                    <div
                                      className={clsx(
                                        'w-2 h-2 rounded-full',
                                        isExternal ? 'bg-purple-500' : 'bg-emerald-500',
                                      )}
                                    />
                                  )}
                                </div>
                              </div>
                            )}
                          </HeadlessRadioGroup.Option>
                        ))}
                      </HeadlessRadioGroup>
                    );
                  }}
                />
              </div>

              {/* Manual Selection - Internal Staff */}
              {assignmentMethod === 'manual' && assignmentType === 'internal' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Staff Member <span className="text-danger">*</span>
                  </label>
                  {selectedStaff ? (
                    <StaffDisplay
                      staff={selectedStaff}
                      onClear={
                        isReadOnly
                          ? undefined
                          : () => {
                              setValue('selectedStaff', null, { shouldDirty: true });
                              setValue('staffId', null, { shouldDirty: true });
                            }
                      }
                    />
                  ) : (
                    !isReadOnly && (
                      <button
                        type="button"
                        onClick={openStaffModal}
                        className="w-full border border-dashed border-gray-300 rounded-lg p-4 text-left hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center justify-between"
                      >
                        <span className="text-sm text-gray-500">
                          Click to search and select staff member...
                        </span>
                        <Icon
                          name="magnifying-glass"
                          style="regular"
                          className="w-4 h-4 text-gray-400"
                        />
                      </button>
                    )
                  )}
                  {errors.staffId && (
                    <p className="mt-2 text-sm text-danger">{errors.staffId.message}</p>
                  )}
                </div>
              )}

              {/* Manual Selection - External Company */}
              {assignmentMethod === 'manual' && assignmentType === 'external' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select External Company <span className="text-danger">*</span>
                  </label>
                  {selectedCompany ? (
                    <CompanyDisplay
                      company={selectedCompany}
                      onClear={
                        isReadOnly
                          ? undefined
                          : () => {
                              setValue('selectedCompany', null, { shouldDirty: true });
                              setValue('companyId', null, { shouldDirty: true });
                            }
                      }
                    />
                  ) : (
                    !isReadOnly && (
                      <button
                        type="button"
                        onClick={openCompanyModal}
                        className="w-full border border-dashed border-gray-300 rounded-lg p-4 text-left hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center justify-between"
                      >
                        <span className="text-sm text-gray-500">
                          Click to search and select external company...
                        </span>
                        <Icon
                          name="magnifying-glass"
                          style="regular"
                          className="w-4 h-4 text-gray-400"
                        />
                      </button>
                    )
                  )}
                  {errors.companyId && (
                    <p className="mt-2 text-sm text-danger">{errors.companyId.message}</p>
                  )}
                </div>
              )}

              {/* Round-robin Info */}
              {assignmentMethod === 'roundrobin' && (
                <div
                  className={clsx(
                    'mb-6 rounded-lg p-4',
                    assignmentType === 'internal' ? 'bg-emerald-50' : 'bg-purple-50',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Icon
                      name="circle-info"
                      style="solid"
                      className={clsx(
                        'w-5 h-5 mt-0.5',
                        assignmentType === 'internal' ? 'text-emerald-500' : 'text-purple-500',
                      )}
                    />
                    <div>
                      <p
                        className={clsx(
                          'text-sm font-medium',
                          assignmentType === 'internal' ? 'text-emerald-900' : 'text-purple-900',
                        )}
                      >
                        Round-robin Assignment
                      </p>
                      <p
                        className={clsx(
                          'text-sm mt-1',
                          assignmentType === 'internal' ? 'text-emerald-700' : 'text-purple-700',
                        )}
                      >
                        {assignmentType === 'internal'
                          ? 'The system will automatically assign this appraisal to the next available staff member based on current workload distribution.'
                          : 'The system will automatically assign this appraisal to the next external company based on the rotation schedule.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Internal Followup Staff - Only for external assignments */}
              {assignmentType === 'external' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Internal Followup Staff <span className="text-danger">*</span>
                  </label>
                  {selectedFollowupStaff ? (
                    <StaffDisplay
                      staff={selectedFollowupStaff}
                      onClear={
                        isReadOnly
                          ? undefined
                          : () => {
                              setValue('selectedFollowupStaff', null, { shouldDirty: true });
                              setValue('followupStaffId', null, { shouldDirty: true });
                            }
                      }
                      variant="purple"
                    />
                  ) : (
                    !isReadOnly && (
                      <button
                        type="button"
                        onClick={openFollowupStaffModal}
                        className="w-full border border-dashed border-purple-300 rounded-lg p-4 text-left hover:bg-purple-50 hover:border-purple-400 transition-colors flex items-center justify-between"
                      >
                        <span className="text-sm text-gray-500">
                          Click to search and select internal followup staff...
                        </span>
                        <Icon
                          name="magnifying-glass"
                          style="regular"
                          className="w-4 h-4 text-purple-400"
                        />
                      </button>
                    )
                  )}
                  {errors.followupStaffId && (
                    <p className="mt-2 text-sm text-danger">{errors.followupStaffId.message}</p>
                  )}
                </div>
              )}
            </FormCard>

            {/* Current Assignment Info (if already assigned) */}
            {/*{currentAssignment && (*/}
            {/*  <FormCard*/}
            {/*    title="Current Assignment"*/}
            {/*    subtitle="This appraisal has been assigned"*/}
            {/*    icon="check-circle"*/}
            {/*    iconColor="emerald"*/}
            {/*  >*/}
            {/*    <div className="space-y-4">*/}
            {/*      <div className="flex items-center gap-4">*/}
            {/*        <div className="size-12 rounded-full bg-primary-100 flex items-center justify-center">*/}
            {/*          <Icon name="user" style="solid" className="size-5 text-primary-700" />*/}
            {/*        </div>*/}
            {/*        <div>*/}
            {/*          <div className="text-sm font-medium text-gray-900">*/}
            {/*            {currentAssignment.externalAppraiserName ||*/}
            {/*              currentAssignment.assigneeUserId ||*/}
            {/*              'Assigned'}*/}
            {/*          </div>*/}
            {/*          <div className="text-xs text-gray-500">*/}
            {/*            {currentAssignment.assignmentType}*/}
            {/*          </div>*/}
            {/*        </div>*/}
            {/*        <Badge*/}
            {/*          type="status"*/}
            {/*          value={currentAssignment.assignmentStatus}*/}
            {/*          className="ml-auto"*/}
            {/*        />*/}
            {/*      </div>*/}

            {/*      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">*/}
            {/*        <div>*/}
            {/*          <div className="text-xs text-gray-500">Assignment Source</div>*/}
            {/*          <div className="text-sm font-medium text-gray-900">*/}
            {/*            {currentAssignment.assignmentMethod}*/}
            {/*          </div>*/}
            {/*        </div>*/}
            {/*        <div>*/}
            {/*          <div className="text-xs text-gray-500">Assigned At</div>*/}
            {/*          <div className="text-sm font-medium text-gray-900">*/}
            {/*            {new Date(currentAssignment.assignedAt).toLocaleString('th-TH')}*/}
            {/*          </div>*/}
            {/*        </div>*/}
            {/*      </div>*/}
            {/*    </div>*/}
            {/*  </FormCard>*/}
            {/*)}*/}

            {/* Quotation Section - Show when quotation method is selected */}
            {assignmentMethod === 'quotation' && (
              <QuotationSection
                appraisalId={appraisalId ?? ''}
                onAddToExisting={openAddToQuotationModal}
                onCreateNew={openCreateQuotationModal}
              />
            )}
          </div>
        </div>

        {/* Sticky Action Buttons */}
        {!isReadOnly && (
          <div className="shrink-0 bg-white border-t border-gray-200 px-4 py-3 pr-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Button variant="ghost" type="button" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" type="button" disabled={!isDirty}>
                  <Icon style="regular" name="floppy-disk" className="size-4 mr-2" />
                  Save Draft
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Icon style="solid" name="spinner" className="size-4 mr-2 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <Icon style="solid" name="paper-plane" className="size-4 mr-2" />
                      Assign
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Modals */}
      {!isReadOnly && (
        <>
          <SearchStaffModal
            isOpen={isStaffModalOpen}
            onClose={closeStaffModal}
            onSelect={handleStaffSelect}
          />
          <SearchStaffModal
            isOpen={isFollowupStaffModalOpen}
            onClose={closeFollowupStaffModal}
            onSelect={handleFollowupStaffSelect}
          />
          <SearchCompanyModal
            isOpen={isCompanyModalOpen}
            onClose={closeCompanyModal}
            onSelect={handleCompanySelect}
          />
          <AddToQuotationModal
            isOpen={isAddToQuotationModalOpen}
            onClose={closeAddToQuotationModal}
            appraisalId={appraisalId ?? ''}
          />
          <CreateQuotationModal
            isOpen={isCreateQuotationModalOpen}
            onClose={closeCreateQuotationModal}
            appraisalId={appraisalId ?? ''}
          />
        </>
      )}
    </div>
  );
};

export default AdministrationPage;
