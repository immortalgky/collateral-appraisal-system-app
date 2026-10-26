import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { FormField } from '@/shared/components/form';

/**
 * Labels for the two schema fields the template popover owns (`collateralType`,
 * `pricingTemplateCode`). The popover is closed when a Save fails, so the missing-fields chip finds
 * neither in the page and falls back to these. Only the labels are read, so the field type is moot.
 */
export function useTemplateMissingFields(templateFieldName = 'pricingTemplateCode'): FormField[] {
  const { t } = useTranslation('pricingAnalysis');
  return useMemo<FormField[]>(
    () => [
      { type: 'text-input', name: 'collateralType', label: t('template.collateralType') },
      { type: 'text-input', name: templateFieldName, label: t('template.template') },
    ],
    [t, templateFieldName],
  );
}
