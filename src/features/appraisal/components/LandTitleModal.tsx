import Button from '@/shared/components/Button';
import { type UseFormReturn } from 'react-hook-form';

interface LandTitleModalProps {
  headers: Array<{ name?: string; label: string; inputType?: string }>;
  popupForm: UseFormReturn<any>;
  onCancel: () => void;
  onConfirm: () => void;
}

const LandTitleModal = ({ headers, popupForm, onCancel, onConfirm }: LandTitleModalProps) => {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl h-3/5 w-4/5 flex flex-col">
        <h2 className="text-lg font-semibold mb-4 shrink-0">Add Item</h2>

        <form className="space-y-4 flex-1 overflow-y-auto grid grid-cols-3 gap-6">
          {headers.map((header, i) =>
            'name' in header ? (
              <div key={i} className="gap-y-1">
                <label className="text-sm font-medium col-span-3">{header.label}</label>
                <input
                  {...popupForm.register(header.name)}
                  type={header.inputType || 'text'}
                  className="mt-1 w-full border rounded px-3 py-2 col-span-3"
                />
              </div>
            ) : null,
          )}
        </form>

        <div className="mt-6 flex justify-end gap-2 shrink-0">
          <Button variant="ghost" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" type="button" onClick={onConfirm}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LandTitleModal;
