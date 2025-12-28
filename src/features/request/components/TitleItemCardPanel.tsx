import { useFieldArray, useFormContext } from 'react-hook-form';
import TitleItemCard from './TitleItemCard';
import type { RequestTitleDtoType } from '@/shared/forms/v1';
import Icon from '@/shared/components/Icon';
import { requestTitleDtoDefaults } from '@/shared/forms/defaults';

interface TitleItemCardPanelProps {
  name: string;
  setEditIndex: React.Dispatch<React.SetStateAction<number | undefined>>;
}

const TitleItemCardPanel = ({ name, setEditIndex }: TitleItemCardPanelProps) => {
  const { getValues, control } = useFormContext();
  const { fields, append } = useFieldArray({
    control,
    name,
  });
  const values: RequestTitleDtoType[] = getValues(name);
  const handleAddRow = () => {
    append({ ...requestTitleDtoDefaults });
    setEditIndex(fields.length);
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4">
        {values.map((value, index) => (
          // TODO: Stop using index as a key here
          <TitleItemCard
            label={
              value.collateralType ? value.collateralType : 'Title Item'
            }
            description="description"
            key={index}
            onClick={() => setEditIndex(index)}
          />
        ))}
      </div>
      <div>
        <button
          type="button"
          onClick={handleAddRow}
          className="w-full flex items-center justify-center m-0 px-0 py-1"
        >
          <div className="bg-success size-6 rounded-full flex items-center justify-center">
            <Icon style="solid" name="plus" className="text-white" />
          </div>
        </button>
      </div>
    </div>
  );
};

export default TitleItemCardPanel;
