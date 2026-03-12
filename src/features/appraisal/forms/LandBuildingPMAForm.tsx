import { FormFields, type FormField } from '@/shared/components/form';
import Icon from '@/shared/components/Icon';

const LandBuildingPMAForm = () => {
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
          <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
            <Icon name="house-chimney" style="solid" className="w-5 h-5 text-amber-600" />
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
    label: 'Rawang',
    name: 'rawang',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Land No.',
    name: 'landNo',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Survey No.',
    name: 'surveyNo',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Title Deed No.',
    name: 'titleNo',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Book No.',
    name: 'bookNumber',
    wrapperClassName: 'col-span-1',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Page No.',
    name: 'pageNumber',
    wrapperClassName: 'col-span-1',
    required: true,
  },
  {
    type: 'number-input',
    label: 'Rai',
    name: 'areaRai',
    wrapperClassName: 'col-span-1',
    required: true,
  },
  {
    type: 'number-input',
    label: 'Ngan',
    name: 'areaNgan',
    wrapperClassName: 'col-span-1',
    required: true,
  },
  {
    type: 'number-input',
    label: 'Wa',
    name: 'areaSquareWa',
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
    addressSource: 'title',
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

export default LandBuildingPMAForm;
