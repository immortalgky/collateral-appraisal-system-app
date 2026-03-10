import { ActionBar, Button, Icon } from '@/shared/components';

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
    <ActionBar>
      <ActionBar.Left>
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancel
        </Button>
        {showReset && onReset && (
          <>
            <ActionBar.Divider />
            <Button variant="ghost" type="button" onClick={onReset} className="text-red-500 hover:text-red-600">
              <Icon name="arrow-rotate-left" style="solid" className="size-4 mr-2" />
              Reset
            </Button>
          </>
        )}
        <ActionBar.Divider />
      </ActionBar.Left>
      <ActionBar.Right>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <Icon name="spinner" style="solid" className="size-4 mr-2 animate-spin" />
          ) : (
            <Icon name="check" style="solid" className="size-4 mr-2" />
          )}
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </ActionBar.Right>
    </ActionBar>
  );
}
