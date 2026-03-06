import { FormFields } from '@/shared/components/form';
import SectionHeader from '@/shared/components/sections/SectionHeader';
import { requestFields } from '../configs/fields';

const RequestForm = () => {
  return (
    <div>
      <SectionHeader title="Request" />
      <div className="grid grid-cols-3 gap-4">
        <FormFields fields={requestFields} />
      </div>
    </div>
  );
};

export default RequestForm;
