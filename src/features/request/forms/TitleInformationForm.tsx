import FormSection, { type FormField } from '@/shared/components/sections/FormSection';
import { useEffect, useRef, useState } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import TitleLandForm from './TitleLandForm';
import TitleBuildingForm from './TitleBuildingForm';
import TitleCondoForm from './TitleCondoForm';
import TitleVehicleForm from './TitleVehicleForm';
import TitleMachineForm from './TitleMachineForm';
import FormCard from '@/shared/components/sections/FormCard';
import Icon from '@/shared/components/Icon';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import TitleDocumentAdressForm from './TitleDocumentAddressForm';
import DopaAdressForm from './DopaAddressForm';
import { requestTitleDtoDefaults } from '@/shared/forms/defaults';
import { RequestTitleDto, type RequestTitleDtoType } from '@/shared/forms/v1';
import clsx from 'clsx';

interface TitleFormProps {
  index: number;
  currentFormType: string | undefined;
}

const TitleInformationForm = () => {
  const [editIndex, setEditIndex] = useState<number | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; index: number | null }>({
    isOpen: false,
    index: null,
  });
  const { control } = useFormContext();
  const { append, remove } = useFieldArray({ control, name: 'titles' });
  const titles: RequestTitleDtoType[] = useWatch({ name: 'titles', control });

  // Check if title passes Zod validation (uses same schema as form)
  const isTitleComplete = (index: number): boolean => {
    const title = titles[index];
    if (!title) return false;
    const result = RequestTitleDto.safeParse(title);
    return result.success;
  };
  const listContainerRef = useRef<HTMLDivElement>(null);

  const isEditing = editIndex !== undefined;
  let currentFormType: string | undefined = undefined;

  if (editIndex !== undefined && titles.length > editIndex) {
    currentFormType = titles[editIndex]?.collateralType;
  }

  // Auto scroll to bottom when new item is added
  useEffect(() => {
    if (listContainerRef.current) {
      listContainerRef.current.scrollTo({
        top: listContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [titles.length]);


  const scrollToSection = () => {
    const section = document.getElementById('title-document-info');
    const scrollContainer = document.getElementById('form-scroll-container');
    if (section && scrollContainer) {
      const containerRect = scrollContainer.getBoundingClientRect();
      const sectionRect = section.getBoundingClientRect();
      const scrollTop = scrollContainer.scrollTop + (sectionRect.top - containerRect.top);
      scrollContainer.scrollTo({
        top: scrollTop,
        behavior: 'smooth',
      });
    }
  };

  const handleAddTitle = () => {
    append({ ...requestTitleDtoDefaults });
    setEditIndex(titles.length);
    setTimeout(scrollToSection, 100);
  };

  const handleSelectTitle = (index: number) => {
    setEditIndex(index);
    scrollToSection();
  };

  const handleBackToList = () => {
    setEditIndex(undefined);
  };

  const handleDeleteTitle = (index: number) => {
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
  };

  const handleDuplicateTitle = (index: number) => {
    const titleToDuplicate = titles[index];
    append({ ...titleToDuplicate });
    setEditIndex(titles.length);
  };

  const getCollateralTypeLabel = (type: string | undefined) => {
    const option = collateralTypeOptions.find(opt => opt.value === type);
    return option?.label || 'New Title';
  };

  const getCollateralTypeIcon = (type: string | undefined) => {
    switch (type) {
      case 'land':
        return 'mountain-sun';
      case 'building':
        return 'building';
      case 'landAndBuilding':
        return 'city';
      case 'condominium':
        return 'building-user';
      case 'vehicle':
        return 'car';
      case 'machine':
        return 'gear';
      case 'leaseAgreementLand':
        return 'file-contract';
      case 'leaseAgreementLandAndBuilding':
        return 'file-signature';
      case 'leaseAgreementBuilding':
        return 'file-lines';
      default:
        return 'file-circle-question';
    }
  };

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    index: number;
  } | null>(null);

  const handleContextMenu = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, index });
  };

  const closeContextMenu = () => setContextMenu(null);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClick = () => closeContextMenu();
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  return (
    <FormCard
      title="Title Information"
      subtitle={isEditing ? `Editing Title ${editIndex + 1}` : `${titles.length} title(s)`}
      icon="file-certificate"
      iconColor="purple"
      rightIcon={
        isEditing ? (
          <button
            type="button"
            onClick={handleBackToList}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Icon style="solid" name="arrow-left" className="size-4" />
            Back to List
          </button>
        ) : (
          <button
            type="button"
            onClick={handleAddTitle}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/80 transition-colors"
          >
            <Icon style="solid" name="plus" className="size-4" />
            Add Title
          </button>
        )
      }
    >
      {!isEditing ? (
        /* Table View */
        <TitleTableView
          titles={titles}
          onSelect={handleSelectTitle}
          onDelete={handleDeleteTitle}
          onDuplicate={handleDuplicateTitle}
          onAdd={handleAddTitle}
          getCollateralTypeLabel={getCollateralTypeLabel}
          getCollateralTypeIcon={getCollateralTypeIcon}
          isTitleComplete={isTitleComplete}
        />
      ) : (
        /* Detail View with Sidebar */
        <div className="flex gap-6">
          {/* Left Sidebar - Title List (Sticky) */}
          <div className="w-56 shrink-0 border-r border-gray-100 pr-6 sticky top-0 self-start">
            {/* Scrollable Title List */}
            <div
              ref={listContainerRef}
              className="overflow-y-auto overflow-x-visible max-h-[calc(100vh-20rem)]"
            >
              <div className="flex flex-col gap-3 pr-1 pt-2 pl-2">
                {titles.map((title, index) => {
                  const isComplete = isTitleComplete(index);

                  return (
                    <div
                      key={index}
                      className={clsx(
                        'group relative flex items-center gap-3 p-3 rounded-xl text-left transition-all cursor-pointer',
                        editIndex === index
                          ? 'bg-primary/10 border-2 border-primary shadow-sm'
                          : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100 hover:border-gray-200',
                      )}
                      onClick={() => handleSelectTitle(index)}
                      onContextMenu={e => handleContextMenu(e, index)}
                    >
                      {/* Index Badge */}
                      <div className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-gray-600 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                        {index + 1}
                      </div>

                      {/* Validation Status Indicator */}
                      <div className={clsx(
                        'absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center shadow-sm',
                        isComplete ? 'bg-success text-white' : 'bg-amber-400 text-white'
                      )}>
                        <Icon style="solid" name={isComplete ? 'check' : 'exclamation'} className="size-2" />
                      </div>

                      <div
                        className={clsx(
                          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm',
                          editIndex === index
                            ? 'bg-primary text-white'
                            : 'bg-white text-gray-500 border border-gray-200',
                        )}
                      >
                        <Icon
                          style="solid"
                          name={getCollateralTypeIcon(title?.collateralType)}
                          className="size-4"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className={clsx(
                            'text-sm font-medium truncate',
                            editIndex === index ? 'text-primary' : 'text-gray-700',
                          )}
                        >
                          {getCollateralTypeLabel(title?.collateralType)}
                        </div>
                        <div className="text-xs text-gray-400 truncate">
                          {title?.titleNo || 'No title number'}
                        </div>
                      </div>
                      {/* Delete button - visible on hover */}
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleDeleteTitle(index);
                        }}
                        className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded bg-danger/10 text-danger hover:bg-danger/20 transition-all shrink-0"
                        title="Delete"
                      >
                        <Icon style="solid" name="xmark" className="size-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pinned Add New Button */}
            <div className="pt-3 mt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={handleAddTitle}
                className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200">
                  <Icon style="solid" name="plus" className="size-4" />
                </div>
                <span className="text-sm font-medium">Add New</span>
              </button>
            </div>
          </div>

          {/* Right Panel - Detail Form */}
          <div className="flex-1 min-w-0">
            <div key={`title-form-${editIndex}`} className="grid grid-cols-6 gap-3 pr-2">
              <FormSection fields={titleFields} namePrefix="titles" index={editIndex} />
              <TitleForm index={editIndex} currentFormType={currentFormType} />
              <TitleDocumentAdressForm index={editIndex} />
              <DopaAdressForm index={editIndex} />
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[140px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => {
              handleDuplicateTitle(contextMenu.index);
              closeContextMenu();
            }}
          >
            <Icon style="regular" name="copy" className="size-4 text-gray-400" />
            Duplicate
          </button>
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
            onClick={() => {
              handleDeleteTitle(contextMenu.index);
              closeContextMenu();
            }}
          >
            <Icon style="regular" name="trash" className="size-4" />
            Delete
          </button>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, index: null })}
        onConfirm={confirmDelete}
        title="Delete Title"
        message="Are you sure you want to delete this title? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </FormCard>
  );
};

/* Table View Component */
interface TitleTableViewProps {
  titles: RequestTitleDtoType[];
  onSelect: (index: number) => void;
  onDelete: (index: number) => void;
  onDuplicate: (index: number) => void;
  onAdd: () => void;
  getCollateralTypeLabel: (type: string | undefined) => string;
  getCollateralTypeIcon: (type: string | undefined) => string;
  isTitleComplete: (index: number) => boolean;
}

const TitleTableView = ({
  titles,
  onSelect,
  onDelete,
  onDuplicate,
  onAdd,
  getCollateralTypeLabel,
  getCollateralTypeIcon,
  isTitleComplete,
}: TitleTableViewProps) => {
  if (titles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Icon style="regular" name="file-lines" className="size-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No titles yet</h3>
        <p className="text-sm text-gray-500 mb-4">Add your first title document to get started</p>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
        >
          <Icon style="solid" name="plus" className="size-4" />
          Add First Title
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider py-3 px-4 w-14">
              #
            </th>
            <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider py-3 px-4">
              Property Type
            </th>
            <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider py-3 px-4">
              Title No / Room No
            </th>
            <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider py-3 px-4">
              Building Type
            </th>
            <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider py-3 px-4">
              Area
            </th>
            <th className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wider py-3 px-4 w-10">
              Status
            </th>
            <th className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider py-3 px-4 w-32">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {titles.map((title, index) => {
            const isComplete = isTitleComplete(index);

            return (
              <tr
                key={index}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onSelect(index)}
              >
                <td className="py-3 px-4">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/20 text-primary text-sm font-medium">
                    {index + 1}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                      <Icon
                        style="solid"
                        name={getCollateralTypeIcon(title?.collateralType)}
                        className="size-4 text-gray-500"
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {getCollateralTypeLabel(title?.collateralType)}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  {title?.titleNo || title?.condo?.condoRoomNo || '-'}
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  {title?.building?.buildingType || '-'}
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">{title?.area?.usageArea || '-'}</td>
                <td className="py-3 px-4 text-center">
                  <div className={clsx(
                    'inline-flex items-center justify-center w-6 h-6 rounded-full',
                    isComplete ? 'bg-success/20 text-success' : 'bg-amber-100 text-amber-600'
                  )}>
                    <Icon style="solid" name={isComplete ? 'check' : 'exclamation'} className="size-3" />
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-1 justify-end">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onSelect(index);
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      title="Edit"
                    >
                      <Icon style="solid" name="pen" className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onDuplicate(index);
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors"
                      title="Duplicate"
                    >
                      <Icon style="regular" name="copy" className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onDelete(index);
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-colors"
                      title="Delete"
                    >
                      <Icon style="solid" name="trash" className="size-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const TitleForm = ({ index, currentFormType }: TitleFormProps) => {
  switch (currentFormType) {
    case 'land':
      return <TitleLandForm index={index} />;
    case 'building':
      return <TitleBuildingForm index={index} />;
    case 'landAndBuilding':
      return (
        <>
          <TitleLandForm index={index} variant="landAndBuilding" />
          <TitleBuildingForm index={index} variant={2} />
        </>
      );
    case 'condominium':
      return <TitleCondoForm index={index} />;
    case 'vehicle':
      return <TitleVehicleForm index={index} />;
    case 'machine':
      return <TitleMachineForm index={index} />;
    case 'leaseAgreementLand':
      return <TitleLandForm index={index} />;
    case 'leaseAgreementLandAndBuilding':
      return (
        <>
          <TitleLandForm index={index} variant="landAndBuilding" />
          <TitleBuildingForm index={index} variant={2} />
        </>
      );
    case 'leaseAgreementBuilding':
      return <TitleBuildingForm index={index} />;
    default:
      return (
        <div className="col-span-6 text-center py-8 text-gray-500">
          <Icon style="regular" name="hand-pointer" className="size-8 mx-auto mb-2 text-gray-400" />
          <p>Please select a collateral type to continue</p>
        </div>
      );
  }
};

const collateralTypeOptions = [
  { value: 'land', label: 'Land' },
  { value: 'landAndBuilding', label: 'Land and Building' },
  { value: 'building', label: 'Building' },
  { value: 'condominium', label: 'Condominium' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'machine', label: 'Machine' },
  { value: 'leaseAgreementLand', label: 'Lease Agreement Land' },
  { value: 'leaseAgreementLandAndBuilding', label: 'Lease Agreement Land and Building' },
  { value: 'leaseAgreementBuilding', label: 'Lease Agreement Building' },
];

const titleFields: FormField[] = [
  {
    type: 'dropdown',
    label: 'Collateral Type',
    name: 'collateralType',
    options: [
      {
        value: 'land',
        label: 'Land',
      },
      {
        value: 'landAndBuilding',
        label: 'Land and Building',
      },
      {
        value: 'building',
        label: 'Building',
      },
      {
        value: 'condominium',
        label: 'Condominium',
      },
      {
        value: 'vehicle',
        label: 'Vehicle',
      },
      {
        value: 'machine',
        label: 'Machine',
      },
      {
        value: 'leaseAgreementLand',
        label: 'Lease Agreement Land',
      },
      {
        value: 'leaseAgreementLandAndBuilding',
        label: 'Lease Agreement Land and Building',
      },
      {
        value: 'leaseAgreementBuilding',
        label: 'Lease Agreement Building',
      },
    ],
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: 'Previous Appraisal Report No / CAS Status',
    name: 'collateralStatus',
    wrapperClassName: 'col-span-3',
    disabled: true,
  },
];

export default TitleInformationForm;
