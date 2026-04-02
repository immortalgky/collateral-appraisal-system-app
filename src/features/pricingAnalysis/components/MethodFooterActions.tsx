import ActionBar from '@/shared/components/ActionBar';
import { Button, Icon } from '@/shared/components';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';

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
  const isReadOnly = usePageReadOnly();
  if (isReadOnly) return null;

  return (
    <ActionBar>
      <ActionBar.Left>
        <Button variant="ghost" type="button" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        {showReset && onReset && (
          <>
            <ActionBar.Divider />
            <Button
              variant="ghost"
              type="button"
              onClick={onReset}
              disabled={isSubmitting}
              className="text-red-500 hover:text-red-600"
            >
              <Icon name="arrow-rotate-left" style="solid" className="size-4 mr-2" />
              Reset
            </Button>
          </>
        )}
        <ActionBar.Divider />
      </ActionBar.Left>
      <ActionBar.Right>
        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          {!isSubmitting && <Icon style="solid" name="check" className="size-4 mr-2" />}
          Save
        </Button>
      </ActionBar.Right>
    </ActionBar>
  );
}
