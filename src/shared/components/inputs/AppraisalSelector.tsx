import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { runGuarded } from '@/shared/utils/runGuarded';
import { useFormReadOnly } from '../form/context';
import Icon from '../Icon';
import SearchAppraisalModal from '@/features/request/components/SearchAppraisalModal';
import { useAppraisalCopyHandler } from '@/features/request/contexts/AppraisalCopyContext';
import type { PriorAppraisal } from '@/features/appraisal/api/priorAppraisal';

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
  required?: boolean;
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
  required = false,
  error,
  className,
}: AppraisalSelectorProps) => {
  const { setValue, watch, control } = useFormContext();
  const isReadOnly = useFormReadOnly();
  // Picks up the pick handler when inside an AppraisalCopyProvider
  const copyHandlers = useAppraisalCopyHandler();
  const { t } = useTranslation('common');
  // The prior is fixed: a submitted request, or a draft the periodical-reappraisal Initiate created
  const priorLocked = !!useWatch({ control, name: 'meta.priorLocked' });
  const isDisabled = disabled || isReadOnly || priorLocked || !!copyHandlers?.disabled;

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

  const handleSelectTemplate = (template: PriorAppraisal) => {
    if (copyHandlers) {
      // Delegate to the caller (RequestPage): full copy when creating, reference + files for a draft
      runGuarded(() => copyHandlers.onSelect(template), t('status.error'));
    } else {
      // Legacy mode: just stamp the three metadata fields
      // From the picked appraisal's header (`request.prevAppraisal` is ITS prior book, not this one)
      setValue(name, template.appraisalNumber, { shouldDirty: true });
      setValue(idField, template.id, { shouldDirty: true });
      if (valueField) setValue(valueField, template.appraisalValue, { shouldDirty: true });
      if (dateField) setValue(dateField, template.appraisalDate, { shouldDirty: true });
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();

    // The caller clears the fields itself, and removes the files carried from the old reference
    if (copyHandlers) {
      runGuarded(() => copyHandlers.onClear(), t('status.error'));
      return;
    }

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
        <label data-field-label className="block text-xs font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
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
        onSelect={handleSelectTemplate}
      />
    </div>
  );
};

export default AppraisalSelector;
