import Button from '@/shared/components/Button';

interface LandTitleModalProps {
  items: any[];
  fieldsInfo: string[];
  onSelect: (item: any) => void;
  onCancel: () => void;
}

const LandTitleModal = ({ items, fieldsInfo, onSelect, onCancel }: LandTitleModalProps) => {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl h-3/5 w-3/5 flex flex-col">
        <h2 className="text-lg font-semibold mb-2 shrink-0">Select Land Title</h2>
        <div className="h-[0.1px] bg-gray-300 my-2 col-span-5"></div>

        <div className="flex-1 overflow-y-auto space-y-3">
          {items.map((item, idx) => (
            <button
              key={idx}
              onClick={() => onSelect(item)}
              className="flex gap-4 w-full text-left p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              {fieldsInfo.map(f => (
                <div key={f} className="text-sm">
                  <span className="font-semibold capitalize">{f}:</span> {item[f] ?? '-'}
                </div>
              ))}
            </button>
          ))}

          {items.length === 0 && (
            <div className="text-center text-gray-500 py-10">No items available</div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2 shrink-0">
          <Button variant="ghost" type="button" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LandTitleModal;
