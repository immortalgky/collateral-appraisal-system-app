import FormTable from '@features/request/components/tables/FormTable';

interface LandAreaDeductionTableProps {
  /** Field-array name. Defaults to the land form's own field. */
  name?: string;
}

/**
 * Areas the appraiser cannot price — an encroaching structure, a strip used by someone else, a
 * public waterway. Their sum comes off the registered title area before any land value is worked
 * out; the deed's own area never changes.
 *
 * Reasons come from the `LandAreaDeductionReason` parameter group, so the dropdown and the
 * read-only rendering both resolve their label the same way every other coded field does.
 */
export default function LandAreaDeductionTable({
  name = 'landAreaDeductions',
}: LandAreaDeductionTableProps) {
  return (
    <div className="col-span-12 cas-deduction-cells rounded border border-gray-200">
      <FormTable columns={deductionColumns} name={name} sumColumns={['areaInSqWa']} />
    </div>
  );
}

const deductionColumns = [
  { rowNumberColumn: true as const, label: '#' },
  {
    name: 'reasonCode',
    label: 'สาเหตุ',
    inputType: 'dropdown' as const,
    group: 'LandAreaDeductionReason',
    width: '34%',
  },
  {
    name: 'areaInSqWa',
    label: 'เนื้อที่ (ตร.ว.)',
    inputType: 'number' as const,
    width: '130px',
    align: 'right' as const,
    maxIntegerDigits: 8,
    decimalPlaces: 2,
  },
  // Percentages must leave room for the two fixed columns FormTable adds itself — the row number
  // and the delete button, 60px each. 32+18+50 came to a full 100% and pushed the last column off
  // the edge under `table-fixed`.
  { name: 'remark', label: 'หมายเหตุ', width: 'auto', maxLength: 4000 },
];
