import Button from '@/shared/components/Button';
import { hover } from '@testing-library/user-event/dist/cjs/convenience/hover.js';
import clsx from 'clsx';
import { useState } from 'react';

interface LandTitleModalProps {
  items: any[];
  fieldsInfo: string[];
  onConfirm: (item: any[]) => void;
  onCancel: () => void;
}

const fieldLabelMap = {
  titleDeedNo: 'Title Deed No',
  bookNo: 'Book No',
  pageNo: 'Page No',
  landNo: 'Land No',
  surveyNo: 'Survey No',
  rai: 'Rai',
  ngan: 'Ngan',
  wa: 'Wa',
  totalSqWa: 'Total Sq. Wa',
};

const LandTitleModal = ({ items, fieldsInfo, onConfirm, onCancel }: LandTitleModalProps) => {
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const onSelect = (item: any) => {
    setSelectedItems(prev =>
      prev.some(i => i.id === item.id) ? prev.filter(i => i.id !== item.id) : [...prev, item],
    );
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl h-3/5 w-3/5 flex flex-col">
        <h2 className="text-lg font-semibold mb-2 shrink-0">Select Land Title</h2>
        <div className="h-[0.1px] bg-gray-300 my-2 col-span-5"></div>

        <div className="flex-1 overflow-y-auto space-y-3 mt-4">
          {items.map((item, idx) => {
            const titleDeedNo = item.titleDeedNo ?? '-';
            const otherFields = fieldsInfo.filter(f => f !== 'titleDeedNo');

            return (
              <div
                key={idx}
                onClick={() => onSelect(item)}
                className={clsx(
                  'group w-full p-4 border border-gray-200 rounded-xl cursor-pointer transition-all ',
                  selectedItems.some(i => i.id === item.id)
                    ? 'bg-primary/10 border-primary shadow-sm'
                    : 'hover:bg-primary/10 hover:border-primary',
                )}
              >
                {/* Row 1: Title Deed No */}
                <div
                  className={clsx(
                    'text-lg font-semibold text-gray-900',
                    selectedItems.some(i => i.id === item.id)
                      ? 'text-primary'
                      : 'group-hover:text-primary',
                  )}
                >
                  Title Deed No : {titleDeedNo}
                </div>

                {/* Row 2: Other fields */}
                <div
                  className={clsx(
                    'mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600',
                    selectedItems.some(i => i.id === item.id)
                      ? 'text-primary'
                      : 'group-hover:text-primary',
                  )}
                >
                  {otherFields.map(f => (
                    <div key={f} className="whitespace-nowrap">
                      <span
                        className={clsx(
                          'font-medium text-gray-500 ',
                          selectedItems.some(i => i.id === item.id)
                            ? 'text-primary'
                            : 'group-hover:text-primary',
                        )}
                      >
                        {fieldLabelMap[f] ?? f} :
                      </span>{' '}
                      {item[f] ?? '-'}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {items.length === 0 && (
            <div className="text-center text-gray-500 py-10">No items available</div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2 shrink-0">
          <Button variant="ghost" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button disabled={selectedItems.length === 0} onClick={() => onConfirm(selectedItems)}>
            Add
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LandTitleModal;
