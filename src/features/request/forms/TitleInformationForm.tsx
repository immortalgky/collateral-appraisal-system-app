import FormSection, { type FormField } from '@/shared/components/sections/FormSection';
import TitleItemCardPanel from '../components/TitleItemCardPanel';
import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import TitleLandForm from './TitleLandForm';
import TitleBuildingForm from './TitleBuildingForm';
import TitleCondoForm from './TitleCondoForm';
import TitleVehicleForm from './TitleVehicleForm';
import TitleMachineForm from './TitleMachineForm';
import FormCard from '@/shared/components/sections/FormCard';
import Icon from '@/shared/components/Icon';
import TitleInformationTable from '../components/tables/TitleInformationTable';
import TitleDocumentAdressForm from './TitleDocumentAddressForm';
import DopaAdressForm from './DopaAddressForm';

interface TitleInformationMainPanelProps {
  index: number | undefined;
  currentFormType: string | undefined;
}

interface TitleFormProps {
  index: number;
  currentFormType: string | undefined;
}

const TitleInformationForm = () => {
  const [editIndex, setEditIndex] = useState<number | undefined>();
  const { control } = useFormContext();
  const titles = useWatch({ name: 'titles', control });

  let currentFormType = undefined;

  // when append, editIndex might get updated before titles
  if (editIndex !== undefined && titles.length > editIndex) {
    currentFormType = titles[editIndex].collateral.collateralType;
  }
  return (
    <FormCard
      title="Title Information"
      rightIcon={
        editIndex !== undefined && (
          <button
            type="button"
            onClick={() => setEditIndex(undefined)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <Icon style="light" name="square-list" className="size-5" />
          </button>
        )
      }
    >
      <div className="flex gap-6">
        <div className="w-1/5">
          <TitleItemCardPanel name="titles" setEditIndex={setEditIndex} />
        </div>
        <div className="w-full">
          <TitleInformationMainPanel
            index={editIndex}
            currentFormType={currentFormType}
            key={editIndex}
          />
        </div>
      </div>
    </FormCard>
  );
};

const TitleInformationMainPanel = ({ index, currentFormType }: TitleInformationMainPanelProps) => {
  return index === undefined ? (
    <TitleInformationTable />
  ) : (
    <div className="grid grid-cols-6 gap-3">
      <FormSection fields={titleFields} namePrefix="titles" index={index} />
      <TitleForm index={index} currentFormType={currentFormType} />
      <TitleDocumentAdressForm index={index} />
      <DopaAdressForm index={index} />
    </div>
  );
};

const TitleForm = ({ index, currentFormType }: TitleFormProps) => {
  switch (currentFormType) {
    case 'land':
      return <TitleLandForm index={index} />;
    case 'building':
      return <TitleBuildingForm index={index} />;
    case 'landAndBuilding':
      return (
        <>
          <TitleLandForm index={index} variant="landAndBuilding" />
          <TitleBuildingForm index={index} variant={2} />
        </>
      );
    case 'condominium':
      return <TitleCondoForm index={index} />;
    case 'vehicle':
      return <TitleVehicleForm index={index} />;
    case 'machine':
      return <TitleMachineForm index={index} />;
    case 'leaseAgreementLand':
      return <TitleLandForm index={index} />;
    case 'leaseAgreementLandAndBuilding':
      return (
        <>
          <TitleLandForm index={index} variant="landAndBuilding" />
          <TitleBuildingForm index={index} variant={2} />
        </>
      );
    case 'leaseAgreementBuilding':
      return <TitleBuildingForm index={index} />;
    default:
      return (
        <div>
          <TitleInformationTable />
        </div>
      );
  }
};

const titleFields: FormField[] = [
  {
    type: 'dropdown',
    label: 'Collateral Type',
    name: 'collateral.collateralType',
    options: [
      {
        value: 'land',
        label: 'Land',
      },
      {
        value: 'landAndBuilding',
        label: 'Land and Building',
      },
      {
        value: 'building',
        label: 'Building',
      },
      {
        value: 'condominium',
        label: 'Condominium',
      },
      {
        value: 'vehicle',
        label: 'Vehicle',
      },
      {
        value: 'machine',
        label: 'Machine',
      },
      {
        value: 'leaseAgreementLand',
        label: 'Lease Agreement Land',
      },
      {
        value: 'leaseAgreementLandAndBuilding',
        label: 'Lease Agreement Land and Building',
      },
      {
        value: 'leaseAgreementBuilding',
        label: 'Lease Agreement Building',
      },
    ],
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: 'Previous Appraisal Report No / CAS Status',
    name: 'collateral.collateralStatus',
    wrapperClassName: 'col-span-3',
    disabled: true,
  },
];

export default TitleInformationForm;
