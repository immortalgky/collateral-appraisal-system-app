import { useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import Icon from '@shared/components/Icon';
import type { LandDetailFormType, LandDetailItem } from '../types/landDetail';

const tableHeaders = [
  { key: 'titleDeedNo', label: 'Title Deed No.', width: 'w-24' },
  { key: 'bookNo', label: 'Book No.', width: 'w-20' },
  { key: 'pageNo', label: 'Page No.', width: 'w-20' },
  { key: 'landNo', label: 'Land No.', width: 'w-28' },
  { key: 'surveyNo', label: 'Survey No.', width: 'w-28' },
  { key: 'sheetNo', label: 'Sheet No.', width: 'w-20' },
  { key: 'raiNganWa', label: 'Rai - Ngan - Wa', width: 'w-24' },
  { key: 'sqWa', label: 'Sq. Wa', width: 'w-20' },
  { key: 'documentType', label: 'Document Type', width: 'w-28' },
  { key: 'rawang', label: 'Rawang', width: 'w-28' },
  { key: 'aerialPhotoNo', label: 'Aerial Photo No', width: 'w-28' },
  { key: 'boundaryMarker', label: 'Boundary Marker', width: 'w-28' },
  { key: 'documentValidate', label: 'Document Validate', width: 'w-28' },
  { key: 'pricePerSqWa', label: 'Price per Sq.wa', width: 'w-28' },
  { key: 'governmentPrice', label: 'Government Price', width: 'w-28' },
];

const emptyLandDetail: Omit<LandDetailItem, 'id'> = {
  titleDeedNo: '',
  bookNo: '',
  pageNo: '',
  landNo: '',
  surveyNo: '',
  sheetNo: '',
  raiNganWa: '',
  sqWa: '',
  documentType: '',
  rawang: '',
  aerialPhotoNo: '',
  boundaryMarker: '',
  documentValidate: '',
  pricePerSqWa: '',
  governmentPrice: '',
};

export default function LandDetailTable() {
  const { control, getValues, register } = useFormContext<LandDetailFormType>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'landDetails',
  });
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const handleAddRow = () => {
    append({ ...emptyLandDetail, id: crypto.randomUUID() });
    setEditIndex(fields.length);
  };

  const handleDeleteRow = (index: number) => {
    remove(index);
    if (editIndex === index) {
      setEditIndex(null);
    }
  };

  const calculateTotalArea = () => {
    const landDetails = getValues('landDetails');
    const total = landDetails.reduce((sum, item) => {
      const sqWa = parseFloat(item.sqWa) || 0;
      return sum + sqWa;
    }, 0);
    return total.toFixed(2);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Land Detail</span>
        <button
          type="button"
          onClick={handleAddRow}
          className="btn btn-circle btn-xs btn-success"
        >
          <Icon name="plus" style="solid" className="text-xs" />
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="table table-zebra table-pin-rows table-pin-cols table-xs">
          <thead>
            <tr className="bg-primary text-primary-content">
              {tableHeaders.map(header => (
                <th key={header.key} className={header.width}>
                  {header.label}
                </th>
              ))}
              <th className="w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {fields.length === 0 ? (
              <tr>
                <td colSpan={tableHeaders.length + 1} className="text-center text-base-content/50">
                  No land details added. Click the + button to add.
                </td>
              </tr>
            ) : (
              fields.map((field, index) => (
                <tr key={field.id}>
                  {tableHeaders.map(header => (
                    <td key={header.key}>
                      {editIndex === index ? (
                        <input
                          type="text"
                          {...register(`landDetails.${index}.${header.key as keyof LandDetailItem}`)}
                          className="input input-bordered input-xs w-full"
                        />
                      ) : (
                        <span>{field[header.key as keyof LandDetailItem]}</span>
                      )}
                    </td>
                  ))}
                  <td>
                    <div className="flex gap-1">
                      {editIndex === index ? (
                        <button
                          type="button"
                          onClick={() => setEditIndex(null)}
                          className="btn btn-circle btn-xs btn-success"
                        >
                          <Icon name="check" style="solid" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditIndex(index)}
                          className="btn btn-circle btn-xs btn-ghost text-primary"
                        >
                          <Icon name="pen" style="solid" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(index)}
                        className="btn btn-circle btn-xs btn-ghost text-error"
                      >
                        <Icon name="trash" style="solid" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-primary text-primary-content">
              <td colSpan={tableHeaders.length + 1}>
                <span className="font-medium">Total Area: {calculateTotalArea()} Sq.wa</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
