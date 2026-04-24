import { FormFields } from '@/shared/components/form';
import { titleAddressFields } from '../configs/fields';
import TitleInformationHeader from '../components/TitleInformationHeader';
import { useFormContext } from 'react-hook-form';

interface TitleDocumentAdressFormProps {
  index: number;
  isReadOnly: boolean;
}

const TitleDocumentAddressForm = ({ index, isReadOnly }: TitleDocumentAdressFormProps) => {
  const { getValues, setValue } = useFormContext();

  const prefix = `titles.${index}.titleAddress`;

  const handleCopy = () => {
    const mainAddress = getValues('detail.address');
    setValue(`${prefix}.subDistrict`, mainAddress.subDistrict);
    setValue(`${prefix}.subDistrictName`, mainAddress.subDistrictName);
    setValue(`${prefix}.district`, mainAddress.district);
    setValue(`${prefix}.districtName`, mainAddress.districtName);
    setValue(`${prefix}.province`, mainAddress.province);
    setValue(`${prefix}.provinceName`, mainAddress.provinceName);
    setValue(`${prefix}.postcode`, mainAddress.postcode);
    setValue(`${prefix}.houseNumber`, mainAddress.houseNumber);
    setValue(`${prefix}.projectName`, mainAddress.projectName);
    setValue(`${prefix}.moo`, mainAddress.moo);
    setValue(`${prefix}.soi`, mainAddress.soi);
    setValue(`${prefix}.road`, mainAddress.road);
  };

  return (
    <>
      <TitleInformationHeader
        title="Title document address"
        onCopy={handleCopy}
        isReadOnly={isReadOnly}
        className="col-span-6"
      />
      <FormFields fields={titleAddressFields} namePrefix={'titles'} index={index} />
    </>
  );
};

export default TitleDocumentAddressForm;
