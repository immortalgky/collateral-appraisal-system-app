import type { DCFCategory } from '@features/pricingAnalysis/types/dcf.ts';
import clsx from 'clsx';

interface CategoryGOPExpenseProps {
  category: DCFCategory;
  totalNumberOfYears: number;
  baseStyles: { rowHeader: string; rowBody: string };
}
export function CategoryGOPExpense({
  category,
  totalNumberOfYears,
  baseStyles,
}: CategoryGOPExpenseProps) {
  return (
    <>
      <tr>
        <td className={clsx(baseStyles.rowHeader)}>
          <div className="flex flex-row items-center gap-1.5">{category?.categoryName ?? ''}</div>
        </td>
        {Array.from({ length: totalNumberOfYears }, (_, index) => (
          <td key={index} className={clsx(baseStyles.rowBody)}>
            <span>
              {category.totalCategoryValues?.[index]
                ? category.totalCategoryValues?.[index].toLocaleString()
                : 0}
            </span>
          </td>
        ))}
      </tr>
    </>
  );
}
