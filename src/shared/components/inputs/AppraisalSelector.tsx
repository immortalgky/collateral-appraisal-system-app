import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useFormReadOnly } from '../form/context';
import Icon from '../Icon';
import SearchAppraisalModal, {
  type AppraisalReport,
} from '@/features/request/components/SearchAppraisalModal';

interface AppraisalSelectorProps {
  /** Form path for display field (reportNo) */
  name: string;
  label?: string;
  placeholder?: string;
  /** Form path for appraisal ID */
  idField: string;
  /** Form path for appraisal value */
  valueField?: string;
  /** Form path for appraisal date */
  dateField?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
}

const AppraisalSelector = ({
  name,
  label,
  placeholder = 'Click to search...',
  idField,
  valueField,
  dateField,
  disabled = false,
  error,
  className,
}: AppraisalSelectorProps) => {
  const { setValue, watch } = useFormContext();
  const isReadOnly = useFormReadOnly();
  const isDisabled = disabled || isReadOnly;

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Watch display value and ID for clear button logic
  const displayValue = watch(name);
  const idValue = watch(idField);

  const handleOpenModal = () => {
    if (!isDisabled) {
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSelectAppraisal = (report: AppraisalReport) => {
    // Populate all mapped fields
    setValue(name, report.reportNo, { shouldDirty: true });
    setValue(idField, report.id, { shouldDirty: true });

    if (valueField) {
      setValue(valueField, report.appraisalValue, { shouldDirty: true });
    }

    if (dateField) {
      setValue(dateField, report.appraisalDate, { shouldDirty: true });
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Clear all mapped fields
    setValue(name, null, { shouldDirty: true });
    setValue(idField, null, { shouldDirty: true });

    if (valueField) {
      setValue(valueField, null, { shouldDirty: true });
    }

    if (dateField) {
      setValue(dateField, null, { shouldDirty: true });
    }
  };

  const hasValue = !!idValue;

  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      )}
      <div className="relative">
        <input
          type="text"
          value={displayValue || ''}
          readOnly
          onClick={handleOpenModal}
          disabled={isDisabled}
          className={`block w-full px-3 py-2 pr-16 border rounded-lg text-sm ${
            error
              ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
              : 'border-gray-200 focus:ring-gray-200 focus:border-gray-400'
          } ${
            isDisabled
              ? 'bg-gray-50 text-gray-500 cursor-not-allowed'
              : 'cursor-pointer hover:border-gray-300 bg-white focus:ring-2'
          }`}
          placeholder={isDisabled ? '' : placeholder}
        />

        {/* Clear button */}
        {!isDisabled && hasValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-8 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
            title="Clear selection"
          >
            <Icon name="xmark" style="solid" className="w-4 h-4" />
          </button>
        )}

        {/* Search button */}
        {!isDisabled && (
          <button
            type="button"
            onClick={handleOpenModal}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
            title="Search previous appraisal reports"
          >
            <Icon name="magnifying-glass" style="regular" className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Error message */}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {/* Modal */}
      <SearchAppraisalModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSelect={handleSelectAppraisal}
      />
    </div>
  );
};

export default AppraisalSelector;
