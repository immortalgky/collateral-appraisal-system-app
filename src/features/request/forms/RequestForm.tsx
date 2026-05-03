import { useMemo } from 'react';
import { FormFields } from '@/shared/components/form';
import SectionHeader from '@/shared/components/sections/SectionHeader';
import { requestFields } from '../configs/fields';

interface RequestFormProps {
  /** When true, the AppraisalSelector field is disabled (edit mode). */
  disableAppraisalSelector?: boolean;
}

const RequestForm = ({ disableAppraisalSelector = false }: RequestFormProps) => {
  const fields = useMemo(() => {
    if (!disableAppraisalSelector) return requestFields;
    return requestFields.map(f =>
      f.type === 'appraisal-selector' ? { ...f, disabled: true } : f,
    );
  }, [disableAppraisalSelector]);

  return (
    <div>
      <SectionHeader title="Request" />
      <div className="grid grid-cols-3 gap-4">
        <FormFields fields={fields} />
      </div>
    </div>
  );
};

export default RequestForm;
