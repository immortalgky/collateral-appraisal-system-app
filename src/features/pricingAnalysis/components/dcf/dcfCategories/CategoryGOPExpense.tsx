import type { DCFCategory } from '@features/pricingAnalysis/types/dcf.ts';
import clsx from 'clsx';
import { STK2_CLASS, STK_CLASS, YEAR_CELL_CLASS } from '../dcfTableCellStyles';

interface CategoryGOPExpenseProps {
  category: DCFCategory;
  totalNumberOfYears: number;
}
export function CategoryGOPExpense({ category, totalNumberOfYears }: CategoryGOPExpenseProps) {
  // Computed category (GOP), rendered like the mock's row(..., 'tot') — two sticky
  // cells (item + an empty/muted assumption column, mock:2113-2114) rather than the
  // catrow shape, since GOP has no assumptions of its own to chevron open. Bold +
  // tinted background matches `.g tr.tot td { font-weight: 600; background: var(--surface-2) }`.
  return (
    <tr className="bg-gray-50">
      <td className={clsx(STK_CLASS, 'font-semibold bg-gray-50')}>{category?.categoryName ?? ''}</td>
      <td className={clsx(STK2_CLASS, 'bg-gray-50')} />
      {Array.from({ length: totalNumberOfYears }, (_, index) => (
        <td key={index} className={clsx(YEAR_CELL_CLASS, 'font-semibold bg-gray-50')}>
          <span>
            {category.totalCategoryValues?.[index]
              ? category.totalCategoryValues?.[index].toLocaleString()
              : 0}
          </span>
        </td>
      ))}
    </tr>
  );
}
