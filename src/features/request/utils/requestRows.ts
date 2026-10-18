import type { FormTableColumn } from '../components/tables/FormTable';
import { isBlankRow } from '../components/tables/formTableUtils';
import { CUSTOMER_COLUMNS, PROPERTY_COLUMNS } from '../configs/tableColumns';
import { countFiles } from '../hooks/useRequestMissingFields';

export { CUSTOMER_COLUMNS, PROPERTY_COLUMNS };

/** The rows that are filled in: a create form starts with one blank row in each table, never sent. */
export const withoutBlankRows = (rows: unknown[] | undefined, columns: FormTableColumn[]) =>
  (rows ?? []).filter(row => !isBlankRow(row, columns));

/** What the submit confirm lists: the same rows and files that go out with the request. */
export const submitCounts = (data: Parameters<typeof countFiles>[0]) => ({
  customers: withoutBlankRows(data.customers, CUSTOMER_COLUMNS).length,
  properties: withoutBlankRows(data.properties, PROPERTY_COLUMNS).length,
  titles: data.titles?.length ?? 0,
  files: countFiles(data),
});

/**
 * The body of every create / update / draft call, built from the form. The customer and property
 * tables start with one empty row each; those are dropped (the form keeps them) so a draft never
 * stores blank records. Everything else goes as it is, so a submitted request sends the purpose and
 * prior appraisal it has, unchanged (the BE refuses a change).
 */
export const buildRequestPayload = <
  T extends {
    requestor?: { employeeId?: string | null } | null;
    customers?: unknown[];
    properties?: unknown[];
  },
>(
  data: T,
) => {
  const { requestor, ...rest } = data;
  // `meta` is form-only (see RequestPage), never sent
  const restData = { ...rest } as Omit<T, 'requestor' | 'meta'>;
  delete (restData as Record<string, unknown>).meta;
  return {
    ...restData,
    // Only the employeeId (bank code) goes to the backend, as requestorEmployeeId
    requestorEmployeeId: requestor?.employeeId ?? '',
    customers: withoutBlankRows(data.customers, CUSTOMER_COLUMNS),
    properties: (
      withoutBlankRows(data.properties, PROPERTY_COLUMNS) as {
        sellingPrice?: number | string | null;
      }[]
    ).map(p => ({
      ...p,
      sellingPrice: p.sellingPrice === '' || p.sellingPrice == null ? null : Number(p.sellingPrice),
    })),
  };
};
