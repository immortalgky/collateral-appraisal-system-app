import { FormFields, type FormField } from '@/shared/components/form';
import Icon from '@/shared/components/Icon';

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
          <FormFields fields={propertyField} />
        </div>
      </div>
    </div>
  );
};

const pmaField: FormField[] = [
  {
    type: 'number-input',
    label: 'Selling Price',
    name: 'sellingPrice',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'number-input',
    label: 'Force Selling Price',
    name: 'forcedSalePrice',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'number-input',
    label: 'Building Insurance',
    name: 'buildingInsurancePrice',
    wrapperClassName: 'col-span-3',
    required: true,
  },
];

const propertyField: FormField[] = [
  {
    type: 'text-input',
    label: 'Construction on Title Deed No.',
    name: 'builtOnTitleNumber',
    wrapperClassName: 'col-span-6',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Condominium Registration No.',
    name: 'condoRegistrationNumber',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Condominium Name.',
    name: 'condoName',
    wrapperClassName: 'col-span-6',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Room No.',
    name: 'roomNumber',
    wrapperClassName: 'col-span-1',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Floor No.',
    name: 'floorNumber',
    wrapperClassName: 'col-span-1',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Building No.',
    name: 'buildingNumber',
    wrapperClassName: 'col-span-1',
    required: true,
  },
  {
    type: 'location-selector',
    label: 'Sub District',
    name: 'subDistrict',
    districtField: 'district',
    districtNameField: 'districtName',
    provinceField: 'province',
    provinceNameField: 'provinceName',
    postcodeField: 'postcode',
    subDistrictNameField: 'subDistrictName',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'text-input',
    label: 'District',
    name: 'districtName',
    disabled: true,
    required: true,
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: 'Province',
    name: 'provinceName',
    disabled: true,
    required: true,
    wrapperClassName: 'col-span-3',
  },
];

export default CondoPMAForm;
