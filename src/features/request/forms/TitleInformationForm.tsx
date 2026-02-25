import { type FormField, FormFields, useFormReadOnly } from '@/shared/components/form';
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
import TitleDocumentAddressForm from './TitleDocumentAddressForm';
import DopaAddressForm from './DopaAddressForm';
import {
  requestTitleDefault,
  RequestTitleDto,
  type RequestTitleDtoType,
} from '@/features/request/schemas/form';
import clsx from 'clsx';
import { useTitleLevelRequiredDocuments } from '../hooks/useRequiredDocuments';

interface TitleFormProps {
  index: number;
  currentFormType: string | undefined;
}

const TitleInformationForm = () => {
  const isReadOnly = useFormReadOnly();
  const [editIndex, setEditIndex] = useState<number | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; index: number | null }>({
    isOpen: false,
    index: null,
  });
  const { control } = useFormContext();
  const { append, remove } = useFieldArray({ control, name: 'titles' });
  const titles: RequestTitleDtoType[] = useWatch({ name: 'titles', control });

  // Check if the title passes Zod validation (uses the same schema as form)
  const isTitleComplete = (index: number): boolean => {
    const title = titles[index];

    console.log(title, 'testing');
    console.log(RequestTitleDto.safeParse(title), 'parsed');
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
  }, [titles?.length]);

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
    append({ ...requestTitleDefault });
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
      setDeleteConfirm({ isOpen: false, index: null });
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
      case 'L':
        return 'mountain-sun';
      case 'B':
        return 'building';
      case 'LB':
        return 'city';
      case 'U':
        return 'building-user';
      case 'VEH':
        return 'car';
      case 'MAC':
        return 'gear';
      case 'LSL':
        return 'file-contract';
      case 'LS':
        return 'file-signature';
      case 'LSB':
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

  // Close the context menu when clicking outside
  useEffect(() => {
    const handleClick = () => closeContextMenu();
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  return (
    <>
      {/* Initialize required documents for all titles */}
      {titles?.map((_: any, index: number) => (
        <TitleRequiredDocsInitializer key={`init-${index}`} index={index} />
      ))}

      <FormCard
        title="Title Information"
        subtitle={isEditing ? `Editing Title ${editIndex + 1}` : `${titles?.length} title(s)`}
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
          ) : !isReadOnly ? (
            <button
              type="button"
              onClick={handleAddTitle}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/80 transition-colors"
            >
              <Icon style="solid" name="plus" className="size-4" />
              Add Title
            </button>
          ) : null
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
            isReadOnly={isReadOnly}
          />
        ) : (
          /* Detail View with Sidebar */
          <div className="flex gap-4">
            {/* Left Sidebar - Title List (Sticky) */}
            <div className="w-44 shrink-0 border-r border-gray-100 pr-4 sticky top-0 self-start">
              {/* Scrollable Title List */}
              <div
                ref={listContainerRef}
                className="overflow-y-auto overflow-x-visible max-h-[calc(100vh-20rem)]"
              >
                <div className="flex flex-col gap-2 pr-1 pt-1 pl-1">
                  {titles.map((title, index) => {
                    const isComplete = isTitleComplete(index);

                    return (
                      <div
                        key={index}
                        className={clsx(
                          'group relative flex items-center gap-2 p-2 rounded-lg text-left transition-all cursor-pointer',
                          editIndex === index
                            ? 'bg-primary/10 border border-primary shadow-sm'
                            : 'bg-gray-50 border border-transparent hover:bg-gray-100 hover:border-gray-200',
                        )}
                        onClick={() => handleSelectTitle(index)}
                        onContextMenu={e => handleContextMenu(e, index)}
                      >
                        {/* Index Badge */}
                        <div className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-gray-600 text-white text-[9px] font-bold flex items-center justify-center shadow-sm">
                          {index + 1}
                        </div>

                        {/* Validation Status Indicator */}
                        <div
                          className={clsx(
                            'absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-sm',
                            isComplete ? 'bg-success text-white' : 'bg-amber-400 text-white',
                          )}
                        >
                          <Icon
                            style="solid"
                            name={isComplete ? 'check' : 'exclamation'}
                            className="size-1.5"
                          />
                        </div>

                        <div
                          className={clsx(
                            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm',
                            editIndex === index
                              ? 'bg-primary text-white'
                              : 'bg-white text-gray-500 border border-gray-200',
                          )}
                        >
                          <Icon
                            style="solid"
                            name={getCollateralTypeIcon(title?.collateralType)}
                            className="size-3.5"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className={clsx(
                              'text-xs font-medium truncate',
                              editIndex === index ? 'text-primary' : 'text-gray-700',
                            )}
                          >
                            {getCollateralTypeLabel(title?.collateralType)}
                          </div>
                          <div className="text-[10px] text-gray-400 truncate">
                            {title?.titleNumber || 'No title number'}
                          </div>
                        </div>
                        {/* Delete button - visible on hover (hidden in readOnly) */}
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleDeleteTitle(index);
                            }}
                            className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded bg-danger/10 text-danger hover:bg-danger/20 transition-all shrink-0"
                            title="Delete"
                          >
                            <Icon style="solid" name="xmark" className="size-2.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pinned Add New Button (hidden in readOnly) */}
              {!isReadOnly && (
                <div className="pt-2 mt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleAddTitle}
                    className="w-full flex items-center gap-2 p-2 rounded-lg border border-dashed border-gray-200 text-gray-500 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200">
                      <Icon style="solid" name="plus" className="size-3.5" />
                    </div>
                    <span className="text-xs font-medium">Add New</span>
                  </button>
                </div>
              )}
            </div>

            {/* Right Panel - Detail Form */}
            <div className="flex-1 min-w-0">
              <div key={`title-form-${editIndex}`} className="grid grid-cols-6 gap-3 pr-2">
                <FormFields fields={titleFields} namePrefix="titles" index={editIndex} />
                <TitleForm index={editIndex} currentFormType={currentFormType} />
                <TitleDocumentAddressForm index={editIndex} />
                <DopaAddressForm index={editIndex} />
              </div>
            </div>
          </div>
        )}

        {/* Context Menu (hidden in readOnly) */}
        {contextMenu && !isReadOnly && (
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
    </>
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
  isReadOnly?: boolean;
}

// Helper to get required document stats for a title
const getRequiredDocStats = (
  documents: any[] | undefined,
): { total: number; completed: number } => {
  if (!documents || !Array.isArray(documents)) return { total: 0, completed: 0 };

  let total = 0;
  let completed = 0;

  documents.forEach(doc => {
    if (doc?.isRequired) {
      total++;
      if (doc?.fileName) {
        completed++;
      }
    }
  });

  return { total, completed };
};

const TitleTableView = ({
  titles,
  onSelect,
  onDelete,
  onDuplicate,
  onAdd,
  getCollateralTypeLabel,
  getCollateralTypeIcon,
  isTitleComplete,
  isReadOnly = false,
}: TitleTableViewProps) => {
  if (titles?.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Icon style="regular" name="file-lines" className="size-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No titles yet</h3>
        <p className="text-sm text-gray-500 mb-4">
          {isReadOnly
            ? 'No title documents have been added'
            : 'Add your first title document to get started'}
        </p>
        {!isReadOnly && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
          >
            <Icon style="solid" name="plus" className="size-4" />
            Add First Title
          </button>
        )}
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
              Title Number
            </th>
            <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider py-3 px-4">
              Rawang
            </th>
            <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider py-3 px-4">
              Area
            </th>
            <th className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wider py-3 px-4 w-24">
              Documents
            </th>
            <th className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wider py-3 px-4 w-10">
              Status
            </th>
            {!isReadOnly && (
              <th className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider py-3 px-4 w-32">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {titles?.map((title, index) => {
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
                <td className="py-3 px-4 text-sm text-gray-600">{title?.titleNumber || '-'}</td>
                <td className="py-3 px-4 text-sm text-gray-600">{title?.rawang || '-'}</td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  {title?.collateralType === 'U'
                    ? `${title?.usableArea} sq.m`
                    : `${title?.areaRai || 0}-${title?.areaNgan || 0}-${title?.areaSquareWa || 0}`}
                </td>
                <td className="py-3 px-4 text-center">
                  {(() => {
                    const docStats = getRequiredDocStats(title?.documents);
                    if (docStats.total === 0) {
                      return <span className="text-xs text-gray-400">-</span>;
                    }
                    const isDocComplete = docStats.completed === docStats.total;
                    return (
                      <div
                        className={clsx(
                          'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                          isDocComplete
                            ? 'bg-success/10 text-success'
                            : 'bg-amber-100 text-amber-700',
                        )}
                      >
                        <Icon
                          style="solid"
                          name={isDocComplete ? 'check' : 'asterisk'}
                          className="size-2.5"
                        />
                        {docStats.completed}/{docStats.total}
                      </div>
                    );
                  })()}
                </td>
                <td className="py-3 px-4 text-center">
                  <div
                    className={clsx(
                      'inline-flex items-center justify-center w-6 h-6 rounded-full',
                      isComplete ? 'bg-success/20 text-success' : 'bg-amber-100 text-amber-600',
                    )}
                  >
                    <Icon
                      style="solid"
                      name={isComplete ? 'check' : 'exclamation'}
                      className="size-3"
                    />
                  </div>
                </td>
                {!isReadOnly && (
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
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// Component to initialize required documents for a title (renders nothing)
const TitleRequiredDocsInitializer = ({ index }: { index: number }) => {
  useTitleLevelRequiredDocuments(index);
  return null;
};

const TitleForm = ({ index, currentFormType }: TitleFormProps) => {
  switch (currentFormType) {
    case 'L':
      return <TitleLandForm index={index} />;
    case 'B':
      return <TitleBuildingForm index={index} />;
    case 'LB':
      return (
        <>
          <TitleLandForm index={index} variant="landAndBuilding" />
          <TitleBuildingForm index={index} variant={2} />
        </>
      );
    case 'U':
      return <TitleCondoForm index={index} />;
    case 'VEH':
      return <TitleVehicleForm index={index} />;
    case 'MAC':
      return <TitleMachineForm index={index} />;
    case 'LSL':
      return <TitleLandForm index={index} />;
    case 'LS':
      return (
        <>
          <TitleLandForm index={index} variant="landAndBuilding" />
          <TitleBuildingForm index={index} variant={2} />
        </>
      );
    case 'LSB':
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
  { value: 'L', label: 'Land' },
  { value: 'LB', label: 'Land and Building' },
  { value: 'B', label: 'Building' },
  { value: 'U', label: 'Condominium' },
  { value: 'VEH', label: 'Vehicle' },
  { value: 'MAC', label: 'Machine' },
  { value: 'LSL', label: 'Lease Agreement Land' },
  { value: 'LS', label: 'Lease Agreement Land and Building' },
  { value: 'LSB', label: 'Lease Agreement Building' },
];

const titleFields: FormField[] = [
  {
    type: 'dropdown',
    label: 'Collateral Type',
    name: 'collateralType',
    group: 'PropertyType',
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
