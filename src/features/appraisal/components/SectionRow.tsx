import type { ReactNode } from 'react';
import Icon from '@/shared/components/Icon';

interface SectionRowProps {
  title: string;
  icon?: string;
  children: ReactNode;
  isLast?: boolean;
  /** Sits at the right end of the head, the way the title table's add link does. */
  action?: ReactNode;
  /** The rule under the block takes `my-2`: for sheets whose grid gaps are `gap-y-4` (PMA, rental). */
  spacedRule?: boolean;
  /** Five columns at every width, for a sheet whose grid is `grid-cols-5` (rental), not `xl:grid-cols-5`. */
  fixedColumns?: boolean;
}

// Whole class names, not `col-span-${n}`: Tailwind only generates classes it can read in the source.
const RESPONSIVE_SPAN = {
  head: 'col-span-full xl:col-span-1',
  body: 'col-span-full xl:col-span-4',
  rule: 'col-span-full xl:col-span-5',
};
const FIXED_SPAN = { head: 'col-span-1', body: 'col-span-4', rule: 'col-span-5' };

/**
 * One titled block of a property sheet: a head (icon + title) beside, or above, its fields. The
 * sheet's grid (`cas-section-grid cas-sheet`) is the parent; the form skin turns the head into a
 * band. Shared by the machinery detail and summary, the PMA forms and the rental form.
 */
export const SectionRow = ({
  title,
  icon,
  children,
  isLast = false,
  action,
  spacedRule = false,
  fixedColumns = false,
}: SectionRowProps) => {
  const span = fixedColumns ? FIXED_SPAN : RESPONSIVE_SPAN;
  return (
    <>
      <div className={`cas-section-head ${span.head} pt-1`}>
        <div className="flex w-full items-center gap-2">
          {icon && (
            <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
              <Icon style="solid" name={icon} className="size-3.5 text-primary-600" />
            </div>
          )}
          <span className="text-sm font-medium text-gray-700 leading-tight">{title}</span>
          {action}
        </div>
      </div>
      <div className={span.body}>
        <div className="grid grid-cols-12 gap-4">{children}</div>
      </div>
      {!isLast && (
        <div
          className={`cas-section-rule h-px bg-gray-200 ${span.rule}${spacedRule ? ' my-2' : ''}`}
        />
      )}
    </>
  );
};

export default SectionRow;
