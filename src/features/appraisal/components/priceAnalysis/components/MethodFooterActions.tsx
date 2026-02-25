import { Button, Icon } from '@/shared/components';

export function MethodFooterActions({
  onSaveDraft,
  onCancel,
}: {
  onSaveDraft: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="shrink-0 bg-white border-t border-gray-200 px-4 py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <div className="h-6 w-px bg-gray-200" />
        </div>
        <div className="flex gap-3">
          <Button variant="outline" type="button" onClick={onSaveDraft}>
            <Icon name="floppy-disk" style="regular" className="size-4 mr-2" />
            Save draft
          </Button>
          <Button type="submit">
            <Icon name="check" style="solid" className="size-4 mr-2" />
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
