import FormTable from '../components/tables/FormTable';
import { SectionHeader } from '../../../shared/components';

const PropertiesForm = () => {
  return (
    <div>
      <SectionHeader title="Properties" />
      <FormTable
        name="properties"
        headers={propertiesTableHeader}
        sumColumns={['sellingPrice']}
        totalFieldName="detail.loanDetail.totalSellingPrice"
      />
    </div>
  );
};

const propertiesTableHeader = [
  {
    name: 'propertyType',
    label: 'Property Type',
    inputType: 'dropdown',
    options: [
      { value: 'B', label: 'Building' },
      { value: 'LB', label: 'Land and Building' },
      { value: 'U', label: 'Condominium' },
      { value: 'L', label: 'Land' },
      { value: 'MAC', label: 'Machinery' },
      { value: 'VEH', label: 'Vehicle' },
      { value: 'VES', label: 'Vessel' },
      { value: 'LS', label: 'Lease Agreement (Land and Building)' },
      { value: 'LSL', label: 'Lease Agreement (Land )' },
      { value: 'LSB', label: 'Lease Agreement (Building)' },
      { value: 'LSU', label: 'Lease Agreement (Condo)' },
    ],
  },
  {
    name: 'buildingType',
    label: 'Building Type',
    inputType: 'dropdown',
    options: [
      { value: '01', label: 'Single house' },
      { value: '02', label: 'Commercial building' },
      { value: '03', label: 'Semi-detached house' },
      { value: '04', label: 'Townhouse' },
      { value: '05', label: 'apartment' },
      { value: '06', label: 'Project' },
      { value: '07', label: 'Office building' },
      { value: '08', label: 'Hotel' },
      { value: '09', label: 'Shopping center' },
      { value: '10', label: 'Factory' },
      { value: '11', label: 'Warehouse' },
      { value: '12', label: 'Residential building' },
      { value: '13', label: 'Apartment' },
      { value: '99', label: 'Other' },
    ],
  },
  { name: 'sellingPrice', label: 'Selling Price', inputType: 'number' },
];

export default PropertiesForm;
