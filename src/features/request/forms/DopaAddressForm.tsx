import { FormFields } from '@/shared/components/form';
import { dopaAddressFields } from '../configs/fields';
import TitleInformationHeader from '../components/TitleInformationHeader';
import { useFormContext } from 'react-hook-form';

interface DopaAdressFormProps {
  index: number;
  isReadOnly: boolean;
}

const DopaAddressForm = ({ index, isReadOnly }: DopaAdressFormProps) => {
  const { getValues, setValue } = useFormContext();

  const prefix = `titles.${index}.dopaAddress`;

  const handleCopy = () => {
    const titleAddress = getValues(`titles.${index}.titleAddress`);
    setValue(`${prefix}.subDistrict`, titleAddress.subDistrict);
    setValue(`${prefix}.subDistrictName`, titleAddress.subDistrictName);
    setValue(`${prefix}.district`, titleAddress.district);
    setValue(`${prefix}.districtName`, titleAddress.districtName);
    setValue(`${prefix}.province`, titleAddress.province);
    setValue(`${prefix}.provinceName`, titleAddress.provinceName);
    setValue(`${prefix}.postcode`, titleAddress.postcode);
    setValue(`${prefix}.houseNumber`, titleAddress.houseNumber);
    setValue(`${prefix}.projectName`, titleAddress.projectName);
    setValue(`${prefix}.moo`, titleAddress.moo);
    setValue(`${prefix}.soi`, titleAddress.soi);
    setValue(`${prefix}.road`, titleAddress.road);
  };

  return (
    <>
      <TitleInformationHeader
        title="DOPA address"
        onCopy={handleCopy}
        isReadOnly={isReadOnly}
        className="col-span-6"
      />
      <FormFields fields={dopaAddressFields} namePrefix={'titles'} index={index} />
    </>
  );
};

export default DopaAddressForm;
