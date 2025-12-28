import { FormFields, type FormField } from '@/shared/components/form';

interface TitleVehicleFormProps {
  index: number;
}

const TitleVehicleForm = ({ index }: TitleVehicleFormProps) => {
  return <FormFields fields={vehicleFields} namePrefix={'titles'} index={index} />;
};

const vehicleFields: FormField[] = [
  {
    type: 'dropdown',
    label: 'Vehicle Type',
    name: 'vehicleType',
    options: [
      {
        value: 'a',
        label: 'A',
      },
      {
        value: 'b',
        label: 'B',
      },
    ],
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: 'License Plate Number',
    name: 'licensePlateNumber',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'textarea',
    label: 'Appointment Location',
    name: 'vehicleAppointmentLocation',
    wrapperClassName: 'col-span-6',
  },
];

export default TitleVehicleForm;
