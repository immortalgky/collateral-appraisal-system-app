import Icon from '@/shared/components/Icon';
import { useEffect, useState } from 'react';
import {
  useController,
  useFieldArray,
  useForm,
  useFormContext,
  type Control,
  type FieldValues,
} from 'react-hook-form';
import LandTitleSelectModal from '../LandTitleSelectModal';
import LandTitleInputModal from '../LandTitleInputModal';

interface LandTitleTableProps {
  name: string;
  headers: LandTitleTableHeader[];
}

type LandTitleTableHeader = LandTitleTableRegularHeader | LandTitleTableRowNumberHeader;

interface LandTitleTableRegularHeader {
  name: string;
  label: string;
  type?: string;
  disabled?: boolean;
}

interface LandTitleTableRowNumberHeader {
  rowNumberColumn: true;
  label: string;
}

interface TableCellProps {
  name: string;
  index: number;
  editIndex: number | undefined;
  value: string;
  header: LandTitleTableRegularHeader;
  control: Control<FieldValues, any, FieldValues>;
}

const LandMock = [
  {
    id: 1,
    titleDeedNo: '12345',
    bookNo: '10',
    pageNo: '1',
    landNo: '11',
    surveyNo: '123',
    sheetNo: '123',
    rai: 1,
    ngan: 1,
    wa: 12,
    totalSqWa: 123,
    documentType: 'title',
    rawang: '123123',
    boundaryMarker: null,
    boundartMakerOther: null,
    docValidate: null,
    isMissedOutSurvey: false,
    pricePerSquareWa: null,
    governmentPrice: null,
  },
  {
    id: 2,
    titleDeedNo: '1234',
    bookNo: '11',
    pageNo: '2',
    landNo: '11',
    surveyNo: '123',
    sheetNo: '123',
    rai: 1,
    ngan: 1,
    wa: 12,
    totalSqWa: 123,
    documentType: 'title',
    rawang: '123123',
    boundaryMarker: null,
    boundartMakerOther: null,
    docValidate: null,
    isMissedOutSurvey: false,
    pricePerSquareWa: null,
    governmentPrice: null,
  },
  {
    id: 3,
    titleDeedNo: '123',
    bookNo: '12',
    pageNo: '3',
    landNo: '11',
    surveyNo: '123',
    sheetNo: '123',
    rai: 1,
    ngan: 1,
    wa: 12,
    totalSqWa: 123,
    documentType: 'title',
    rawang: '123123',
    boundaryMarker: null,
    boundartMakerOther: null,
    docValidate: null,
    isMissedOutSurvey: false,
    pricePerSquareWa: null,
    governmentPrice: null,
  },
];

const FieldInfo = [
  'titleDeedNo',
  'bookNo',
  'pageNo',
  'landNo',
  'surveyNo',
  'rai',
  'ngan',
  'wa',
  'totalSqWa',
];

// TODO: Find and add unique key
const LandTitleTable = ({ name, headers }: LandTitleTableProps) => {
  const { control, getValues, setValue } = useFormContext();

  const { append, remove, update } = useFieldArray({ control, name });
  const values = getValues(name) || [];

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const editForm = useForm();

  //initial
  useEffect(() => {
    setValue(name, LandMock);
  }, []);

  // Select
  useEffect(() => {
    if (isEditOpen && editIndex !== null) {
      editForm.reset(values[editIndex]);
    } else {
      editForm.reset({});
    }
  }, [isEditOpen, editIndex]);

  const getSelectableRecords = () => {
    const selectedIds = values.map(v => v.id);
    return LandMock.filter(d => !selectedIds.includes(d.id));
  };

  const handleAddSelect = item => {
    append(item);
    setIsAddOpen(false);
  };

  const handleEditSave = () => {
    const data = editForm.getValues();
    update(editIndex!, data);
    setEditIndex(null);
    setIsEditOpen(false);
  };

  const isEmpty = values.length === 0;

  return (
    <div className="w-full overflow-x-auto">
      <div className="max-h-60 overflow-y-auto">
        <table className="table min-w-max">
          <thead>
            <tr className="bg-primary-700">
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="text-white text-sm font-medium py-3 px-4 text-left first:rounded-tl-lg"
                >
                  {header.label}
                </th>
              ))}
              <th
                className="text-white text-sm font-medium py-3 px-4 text-right sticky right-0
    bg-primary-700 w-24"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isEmpty ? (
              <div></div>
            ) : (
              values.map((field: Record<string, any>, index: number) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  {headers.map((header, inner_index) => {
                    if ('name' in header) {
                      return (
                        <td key={inner_index} className="py-3 px-4">
                          <TableCell
                            name={name}
                            index={index}
                            value={field[header.name]}
                            header={header}
                            control={control}
                            editIndex={undefined}
                          />
                        </td>
                      );
                    } else {
                      return (
                        <td key={inner_index} className="py-3 px-4">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-sm font-medium text-gray-600">
                            {index + 1}
                          </span>
                        </td>
                      );
                    }
                  })}
                  <td className="py-3 px-4 sticky right-0 z-10 bg-white">
                    <div className="flex gap-1 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setEditIndex(index);
                          setIsEditOpen(true);
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
                        title="Edit"
                      >
                        <Icon style="solid" name="pen" className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-danger-50 text-danger-600 hover:bg-danger-100 transition-colors"
                        title="Delete"
                      >
                        <Icon style="solid" name="trash" className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-gray-100 ">
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary-600 bg-gray-50 hover:bg-primary-50 transition-colors rounded-b-lg"
        >
          <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center">
            <Icon style="solid" name="plus" className="size-3 text-white" />
          </div>
          Add item
        </button>
      </div>
      {isAddOpen && (
        <LandTitleSelectModal
          items={getSelectableRecords()}
          fieldsInfo={FieldInfo}
          onSelect={handleAddSelect}
          onCancel={() => setIsAddOpen(false)}
        />
      )}
      {isEditOpen && (
        <LandTitleInputModal
          headers={headers}
          popupForm={editForm}
          onCancel={() => setIsEditOpen(false)}
          onConfirm={handleEditSave}
          isEdit={true}
        />
      )}
    </div>
  );
};

const TableCell = ({ name, index, value, header, control }: TableCellProps) => {
  const cellName = `${name}.${index}.${header.name}`;
  const {
    fieldState: { error },
  } = useController({ name: cellName, control });

  const label = header?.options?.find(opt => opt.value === value)?.label ?? value;

  return (
    <div>
      <div>{label}</div>
      {error && <div className="mt-1 text-sm text-danger">{error?.message}</div>}
    </div>
  );
};

export default LandTitleTable;
