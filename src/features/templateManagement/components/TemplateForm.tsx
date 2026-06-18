import { useTranslation } from 'react-i18next';
import TextInput from '@shared/components/inputs/TextInput';
import Dropdown from '@shared/components/inputs/Dropdown';
import { useParameterOptions } from '@shared/utils/parameterUtils';

interface TemplateFormData {
  templateCode: string;
  templateName: string;
  propertyType: string;
  description: string | null;
}

interface TemplateFormProps {
  value: TemplateFormData;
  onChange: (value: TemplateFormData) => void;
  isEditMode: boolean;
}

const TemplateForm = ({ value, onChange, isEditMode }: TemplateFormProps) => {
  const { t } = useTranslation('templateManagement');
  const propertyTypeOptions = useParameterOptions('PropertyType');

  const handleChange = (field: keyof TemplateFormData, val: string | null) => {
    onChange({ ...value, [field]: val });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <TextInput
        label={t('templateForm.fields.templateCode')}
        value={value.templateCode}
        onChange={e => handleChange('templateCode', e.currentTarget.value)}
        disabled={isEditMode}
        required
        placeholder={t('templateForm.fields.templateCodePlaceholder')}
      />
      <TextInput
        label={t('templateForm.fields.templateName')}
        value={value.templateName}
        onChange={e => handleChange('templateName', e.currentTarget.value)}
        required
        placeholder={t('templateForm.fields.templateNamePlaceholder')}
      />
      <Dropdown
        label={t('templateForm.fields.propertyType')}
        value={value.propertyType}
        onChange={(val: string) => handleChange('propertyType', val)}
        options={propertyTypeOptions}
        required
        placeholder={t('templateForm.fields.propertyTypePlaceholder')}
      />
      <TextInput
        label={t('templateForm.fields.description')}
        value={value.description ?? ''}
        onChange={e => handleChange('description', e.currentTarget.value || null)}
        placeholder={t('templateForm.fields.descriptionPlaceholder')}
      />
    </div>
  );
};

export default TemplateForm;
