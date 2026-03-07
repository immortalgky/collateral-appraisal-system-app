import { FormFields } from '@/shared/components/form';
import { SectionHeader } from '@shared/components';
import { addressFields, contactFields } from '../configs/fields';

const AddressForm = () => {
  return (
    <div>
      <SectionHeader title="Location" />
      <div className="grid grid-cols-6 gap-4">
        <FormFields fields={addressFields} namePrefix="detail.address" />
        <FormFields fields={contactFields} namePrefix="detail.contact" />
      </div>
    </div>
  );
};

export default AddressForm;
