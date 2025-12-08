import FormSection, { type FormField } from '@/shared/components/sections/FormSection';

interface RemarksFormProps {
  index: number;
}

function RemarksForm({ index }: RemarksFormProps) {
  return (
    <div className="grid grid-cols-4 gap-6">
      <div className="font-medium col-span-1">
        <p className="col-span-1">Remarks</p>
      </div>
      <div className="grid grid-cols-12 gap-4 col-span-3">
        <FormSection
          fields={remarksFormFields}
          namePrefix={'collaterals'}
          index={index}
        ></FormSection>
      </div>
    </div>
  );
}

const remarksFormFields: FormField[] = [
  {
    type: 'textarea',
    label: '',
    name: 'condo.remarks',
    wrapperClassName: 'col-span-12',
    required: false,
  },
];

export default RemarksForm;
