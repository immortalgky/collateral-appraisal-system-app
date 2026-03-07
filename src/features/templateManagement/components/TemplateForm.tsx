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
  const propertyTypeOptions = useParameterOptions('PropertyType');

  const handleChange = (field: keyof TemplateFormData, val: string | null) => {
    onChange({ ...value, [field]: val });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <TextInput
        label="Template Code"
        value={value.templateCode}
        onChange={(e) => handleChange('templateCode', e.currentTarget.value)}
        disabled={isEditMode}
        required
        placeholder="e.g., MC_LAND_01"
      />
      <TextInput
        label="Template Name"
        value={value.templateName}
        onChange={(e) => handleChange('templateName', e.currentTarget.value)}
        required
        placeholder="Template name"
      />
      <Dropdown
        label="Property Type"
        value={value.propertyType}
        onChange={(val: string) => handleChange('propertyType', val)}
        options={propertyTypeOptions}
        required
        placeholder="Select property type"
      />
      <TextInput
        label="Description"
        value={value.description ?? ''}
        onChange={(e) => handleChange('description', e.currentTarget.value || null)}
        placeholder="Optional description"
      />
    </div>
  );
};

export default TemplateForm;
