import FormSection, { type FormField } from '@/shared/components/sections/FormSection';

interface AgeHeightCondoFormProps {
  index: number;
}

function AgeHeightCondoForm({ index }: AgeHeightCondoFormProps) {
  return (
    <div className="grid grid-cols-4 gap-6">
      <div className="font-medium col-span-1">
        <p className="col-span-1">Age/ Height of the Condominium Building</p>
      </div>
      <div className="grid grid-cols-12 gap-4 col-span-3">
        <FormSection
          fields={ageHeightCondoFields}
          namePrefix={'collaterals'}
          index={index}
        ></FormSection>
      </div>
    </div>
  );
}

const ageHeightCondoFields: FormField[] = [
  {
    type: 'number-input',
    label: 'Building Age (Years)',
    name: 'condo.buildingYear',
    wrapperClassName: 'col-span-4',
    required: false,
  },
  {
    type: 'number-input',
    label: 'Total Number of Floors',
    name: 'condo.totalFloor',
    wrapperClassName: 'col-span-4',
    required: false,
  },
];

export default AgeHeightCondoForm;
