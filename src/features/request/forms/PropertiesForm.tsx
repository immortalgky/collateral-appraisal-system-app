import { useTranslation } from 'react-i18next';
import FormTable from '../components/tables/FormTable';
import { SectionHeader } from '../../../shared/components';

const PropertiesForm = () => {
  const { t } = useTranslation('request');

  const propertiesColumns = [
    {
      name: 'propertyType',
      label: t('fields.propertyType'),
      inputType: 'dropdown',
      group: 'PropertyType',
    },
    {
      name: 'buildingType',
      label: t('fields.buildingType'),
      inputType: 'dropdown',
      group: 'BuildingType',
    },
    {
      name: 'sellingPrice',
      label: t('fields.sellingPrice'),
      inputType: 'number',
      maxIntegerDigits: 15,
      decimalDigits: 2,
    },
  ];

  return (
    <div>
      <SectionHeader title={t('forms.properties')} required={true} />
      <FormTable
        name="properties"
        columns={propertiesColumns}
        sumColumns={['sellingPrice']}
        totalFieldName="detail.loanDetail.totalSellingPrice"
      />
    </div>
  );
};

export default PropertiesForm;
