import { Button, Icon } from '@/shared/components';

export function MethodFooterActions({
  onCancel,
  onReset,
  isSubmitting = false,
  showReset = false,
}: {
  onCancel: () => void;
  onReset?: () => void;
  isSubmitting?: boolean;
  showReset?: boolean;
}) {
  return (
    <div className="shrink-0 sticky bottom-0 z-40 bg-white border-t border-gray-200 px-4 py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" type="button" onClick={onCancel}>
            Cancel
          </Button>
          {showReset && onReset && (
            <>
              <div className="h-6 w-px bg-gray-200" />
              <Button variant="ghost" type="button" onClick={onReset} className="text-red-500 hover:text-red-600">
                <Icon name="arrow-rotate-left" style="solid" className="size-4 mr-2" />
                Reset
              </Button>
            </>
          )}
          <div className="h-6 w-px bg-gray-200" />
        </div>
        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Icon name="spinner" style="solid" className="size-4 mr-2 animate-spin" />
            ) : (
              <Icon name="check" style="solid" className="size-4 mr-2" />
            )}
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
