import ActionBar from '@/shared/components/ActionBar';
import { Button, Icon } from '@/shared/components';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('pricingAnalysis');
  if (isReadOnly) return null;

  return (
    <ActionBar>
      <ActionBar.Left>
        <Button
          variant="ghost"
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="h-[28px]! px-[12px]! py-0! text-[12.5px]! rounded-[7px]!"
        >
          {t('footer.cancel')}
        </Button>
        {showReset && onReset && (
          <>
            <ActionBar.Divider />
            <Button
              variant="ghost"
              type="button"
              onClick={onReset}
              disabled={isSubmitting}
              title={t('footer.reset')}
              aria-label={t('footer.reset')}
              className="h-[28px]! w-[28px]! px-0! py-0! rounded-[7px]! text-red-500 hover:text-red-600 shrink-0"
            >
              <Icon name="arrow-rotate-left" style="solid" className="size-[13px]" />
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
          className="h-[28px]! px-[12px]! py-0! text-[12.5px]! rounded-[7px]!"
        >
          {!isSubmitting && <Icon style="solid" name="check" className="size-[13px] mr-[6px]" />}
          {t('footer.save')}
        </Button>
      </ActionBar.Right>
    </ActionBar>
  );
}
