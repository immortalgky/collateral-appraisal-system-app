import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { hasConstructionData } from './constructionGrid';

/**
 * Asks before "Under Construction" is switched off while construction data is filled in.
 *
 * Saving a property as not under construction makes the API delete its construction inspection —
 * work items, progress, summary and remark — so this is the last point the user can back out.
 * Cancel puts the toggle back; confirming only changes the toggle, the data goes on save.
 */
export function ConstructionClearGuard() {
  const { t } = useTranslation('appraisal');
  const { setValue, watch } = useFormContext();
  const [isOpen, setIsOpen] = useState(false);

  // `type === 'change'` is the toggle's own onChange, i.e. the user's click. setValue and reset
  // (loading a property, discarding changes, this dialog's Cancel) report no type, so they never
  // open it — whatever the value was before or started as.
  useEffect(() => {
    const subscription = watch((values, { name, type }) => {
      if (name !== 'isUnderConstruction' || type !== 'change') return;
      if (values.isUnderConstruction === false && hasConstructionData(values)) setIsOpen(true);
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  return (
    <ConfirmDialog
      isOpen={isOpen}
      variant="danger"
      title={t('constructionInspection.clearGuard.title')}
      message={t('constructionInspection.clearGuard.message')}
      confirmText={t('constructionInspection.clearGuard.confirm')}
      cancelText={t('constructionInspection.clearGuard.cancel')}
      onConfirm={() => setIsOpen(false)}
      onClose={() => {
        setValue('isUnderConstruction', true, { shouldDirty: true });
        setIsOpen(false);
      }}
    />
  );
}
