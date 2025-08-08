import FormSection, { type FormField } from '@/shared/components/sections/FormSection';

interface TitleVehicleFormProps {
  index: number;
}

const TitleVehicleForm = ({ index }: TitleVehicleFormProps) => {
  return <FormSection fields={vehicleFields} namePrefix={'titles'} index={index} />;
};

const vehicleFields: FormField[] = [
  {
    type: 'dropdown',
    label: 'Vehicle Type',
    name: 'vehicle.vehicleType',
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
    label: 'Registration No',
    name: 'vehicle.vehicleRegistrationNo',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'textarea',
    label: 'Appointment Location',
    name: 'vehicle.vehAppointmentLocation',
    wrapperClassName: 'col-span-6',
  },
];

export default TitleVehicleForm;
