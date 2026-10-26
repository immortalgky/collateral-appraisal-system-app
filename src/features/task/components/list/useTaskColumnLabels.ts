import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { columnDefs, type ColumnKey } from '../../config/columnDefs';

const COLUMN_KEYS = Object.keys(columnDefs) as ColumnKey[];

/** The task columns' names in the user's language, for the table header and the column picker. */
export function useTaskColumnLabels(): Record<ColumnKey, string> {
  const { t } = useTranslation('task');
  return useMemo(
    () =>
      Object.fromEntries(COLUMN_KEYS.map(key => [key, t(`columns.${key}`)])) as Record<
        ColumnKey,
        string
      >,
    [t],
  );
}
