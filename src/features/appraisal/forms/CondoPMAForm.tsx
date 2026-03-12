import { FormFields, type FormField } from '@/shared/components/form';
import Icon from '@/shared/components/Icon';
import { pmaField, condoPMAFields } from '../configs/fields';

const CondoPMAForm = () => {
  return (
    <div className="flex flex-col gap-6">
      {/* PMA Section */}
      <div id="pma-section">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Icon name="file-invoice-dollar" style="solid" className="w-5 h-5 text-emerald-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">PMA</h2>
        </div>
        <div className="h-px bg-gray-200 mb-4" />
        <div className="grid grid-cols-9 gap-4">
          <FormFields fields={pmaField} />
        </div>
      </div>

      {/* Property Section */}
      <div id="property-section">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
            <Icon name="city" style="solid" className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Property</h2>
        </div>
        <div className="h-px bg-gray-200 mb-4" />
        <div className="grid grid-cols-9 gap-4">
          <FormFields fields={condoPMAFields} />
        </div>
      </div>
    </div>
  );
};

export default CondoPMAForm;
