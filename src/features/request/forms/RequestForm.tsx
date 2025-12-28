import { useFormContext } from 'react-hook-form';
import { type FormField, FormFields, useFormReadOnly } from '@/shared/components/form';
import SectionHeader from '@/shared/components/sections/SectionHeader';
import NumberInput from '@/shared/components/inputs/NumberInput';
import DateInput from '@/shared/components/inputs/DateInput';
import Icon from '@/shared/components/Icon';
import SearchAppraisalModal, { type AppraisalReport } from '../components/SearchAppraisalModal';
import { useDisclosure } from '@/shared/hooks/useDisclosure';

const RequestForm = () => {
  const { setValue, watch } = useFormContext();
  const isReadOnly = useFormReadOnly();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const prevAppraisalId = watch('detail.prevAppraisalId');
  const prevAppraisalValue = watch('detail.prevAppraisalValue');
  const prevAppraisalDate = watch('detail.prevAppraisalDate');

  const handleSelectAppraisal = (report: AppraisalReport) => {
    setValue('detail.prevAppraisalId', report.reportNo);
    setValue('detail.prevAppraisalValue', report.appraisalValue);
    setValue('detail.prevAppraisalDate', report.appraisalDate);
  };

  const handleClearAppraisal = () => {
    setValue('detail.prevAppraisalId', '');
    setValue('detail.prevAppraisalValue', null);
    setValue('detail.prevAppraisalDate', null);
  };

  return (
    <div>
      <SectionHeader title="Request" />
      <div className="grid grid-cols-3 gap-4">
        <FormFields fields={requestFieldsTop} />

        {/* Previous Appraisal Row - Search-only implementation */}
        <div className="col-span-1">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Previous Appraisal Report No
          </label>
          <div className="relative">
            <input
              type="text"
              value={prevAppraisalId || ''}
              readOnly
              onClick={isReadOnly ? undefined : onOpen}
              disabled={isReadOnly}
              className={`block w-full px-3 py-2 pr-16 border border-gray-200 rounded-lg text-sm ${
                isReadOnly
                  ? 'bg-gray-50 text-gray-500 cursor-not-allowed'
                  : 'cursor-pointer hover:border-gray-300 bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500'
              }`}
              placeholder={isReadOnly ? '' : 'Click to search...'}
            />
            {!isReadOnly && prevAppraisalId ? (
              <button
                type="button"
                onClick={handleClearAppraisal}
                className="absolute inset-y-0 right-8 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                title="Clear selection"
              >
                <Icon name="xmark" style="solid" className="w-4 h-4" />
              </button>
            ) : null}
            {!isReadOnly && (
              <button
                type="button"
                onClick={onOpen}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-primary-600 transition-colors"
                title="Search previous appraisal reports"
              >
                <Icon name="magnifying-glass" style="regular" className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="col-span-1">
          <NumberInput
            label="Previous Appraisal Value"
            value={prevAppraisalValue ?? ''}
            onChange={() => {}}
            disabled
          />
        </div>

        <div className="col-span-1">
          <DateInput
            label="Previous Appraisal Date"
            value={prevAppraisalDate || ''}
            onChange={() => {}}
            disabled
          />
        </div>

        <FormFields fields={requestFieldsBottom} />
      </div>

      <SearchAppraisalModal isOpen={isOpen} onClose={onClose} onSelect={handleSelectAppraisal} />
    </div>
  );
};

// Fields before the Previous Appraisal row
const requestFieldsTop: FormField[] = [
  {
    type: 'dropdown',
    label: 'Appraisal Purpose',
    name: 'purpose',
    options: [
      { value: '01', label: 'New Loan' },
      { value: '02', label: 'Reappraisal' },
    ],
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'boolean-toggle',
    label: 'Customer bring the appraisal book',
    name: 'detail.hasAppraisalBook',
    options: ['Yes', 'No'],
    wrapperClassName: 'col-span-1',
  },
  {
    type: 'string-toggle',
    label: 'Priority',
    name: 'priority',
    options: [
      { name: 'high', label: 'High' },
      { name: 'normal', label: 'Normal' },
    ],
    wrapperClassName: 'col-span-2',
  },
];

// Fields after the Previous Appraisal row
const requestFieldsBottom: FormField[] = [
  {
    type: 'dropdown',
    label: 'Channel',
    name: 'channel',
    options: [
      { value: 'MANUAL', label: 'Manual' },
      { value: 'LOS', label: 'LOS' },
    ],
    wrapperClassName: 'col-span-1',
    required: true,
  },
  {
    type: 'dropdown',
    label: 'Banking Segment',
    name: 'detail.loanDetail.bankingSegment',
    options: [
      { value: 'RETAIL', label: 'Retail' },
      { value: 'SME', label: 'SME' },
    ],
    wrapperClassName: 'col-span-1',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Loan Application No',
    name: 'detail.loanDetail.loanApplicationNumber',
    wrapperClassName: 'col-span-1',
  },
  {
    type: 'number-input',
    label: 'Apply/Limit Amount',
    name: 'detail.loanDetail.facilityLimit',
    wrapperClassName: 'col-span-1',
  },
  {
    type: 'number-input',
    label: 'Increase Limit Amount',
    name: 'detail.loanDetail.additionalFacilityLimit',
    wrapperClassName: 'col-span-1',
  },
  {
    type: 'number-input',
    label: 'Old Limit Amount',
    name: 'detail.loanDetail.previousFacilityLimit',
    wrapperClassName: 'col-span-1',
  },
];

export default RequestForm;
