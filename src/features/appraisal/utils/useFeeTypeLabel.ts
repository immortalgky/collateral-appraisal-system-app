import { useTranslation } from 'react-i18next';

/**
 * The label of a fee item's type code ('01' appraisal fee, '02' inspection fee, '99' other), from
 * the one key set `feePreview.type.*`. A code it does not know is shown as it is, and no code as
 * nothing, rather than guessing "other". Both fee cards use it.
 */
export const useFeeTypeLabel = () => {
  const { t } = useTranslation('appraisal');
  return (code: string | null | undefined): string => {
    switch (code) {
      case '01':
        return t('feePreview.type.01');
      case '02':
        return t('feePreview.type.02');
      case '99':
        return t('feePreview.type.99');
      default:
        return code ?? '';
    }
  };
};
