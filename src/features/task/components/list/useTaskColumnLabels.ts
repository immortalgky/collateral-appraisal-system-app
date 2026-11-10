import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { columnDefs, type ColumnKey } from '../../config/columnDefs';

const COLUMN_KEYS = Object.keys(columnDefs) as ColumnKey[];

/**
 * The task columns' names in the user's language, for the table header and the column picker.
 * The number column also carries the customer (see NumberCell) unless the customer name column is
 * showing, so its name follows `customerColumnShown`.
 */
export function useTaskColumnLabels(customerColumnShown = false): Record<ColumnKey, string> {
  const { t } = useTranslation('task');
  return useMemo(() => {
    const labels = Object.fromEntries(COLUMN_KEYS.map(key => [key, t(`columns.${key}`)])) as Record<
      ColumnKey,
      string
    >;
    if (customerColumnShown) labels.appraisalNumber = t('columns.appraisalNumberOnly');
    return labels;
  }, [t, customerColumnShown]);
}
