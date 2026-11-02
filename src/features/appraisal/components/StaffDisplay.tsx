import { Children, Fragment, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import Avatar from '@/shared/components/Avatar';
import Badge from '@/shared/components/Badge';
import Button from '@/shared/components/Button';
import type { InternalStaff } from '../types/administration';
import { personLabel } from '../utils/personLabel';
import { workloadTone } from '../utils/workloadTone';

interface StaffDisplayProps {
  staff: InternalStaff;
  onClear?: () => void;
  /** Shows a "Change" button that reopens the picker; the selection stays until another is chosen. */
  onChange?: () => void;
}

/** The selected person or company: a plain surface card with the standard light border. */
export const selectedCardClass =
  'flex justify-between gap-3 rounded-lg border border-(--palette-line) bg-(--palette-surface) px-3 py-2.5';

/** Line 2 of a selected card: the items that exist, a light "·" between neighbours only. */
export const MetaLine = ({ children }: { children: ReactNode }) => {
  // toArray drops the empty ones (false, null, '') and gives each item its key.
  const present = Children.toArray(children).filter(Boolean);
  if (present.length === 0) return null;
  return (
    <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-(--palette-gray-500)">
      {present.map((item, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <span aria-hidden="true" className="text-(--palette-gray-300)">
              ·
            </span>
          )}
          {item}
        </Fragment>
      ))}
    </div>
  );
};

export const ClearButton = ({ onClick }: { onClick: () => void }) => {
  const { t } = useTranslation('appraisal');
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md p-1.5 text-(--palette-gray-400) transition-colors hover:bg-(--palette-surface-3) hover:text-(--palette-gray-600)"
      title={t('administration.clearSelection')}
      aria-label={t('administration.clearSelection')}
    >
      <Icon name="xmark" style="solid" className="text-base" />
    </button>
  );
};

const StaffDisplay = ({ staff, onClear, onChange }: StaffDisplayProps) => {
  const { t } = useTranslation('appraisal');
  // Position, department, phone, email: only what the record has; no line when none.
  return (
    <div className={`${selectedCardClass} items-center border-l-4 border-l-primary`}>
      <div className="flex min-w-0 items-center gap-3">
        <Avatar src={staff.avatar} name={staff.name} size="lg" neutral />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2">
            <span className="text-sm font-semibold text-(--palette-ink)">{staff.name}</span>
            {/* The code the slip uses: the employee id, else the id (always set). */}
            <span className="text-xs text-(--palette-gray-500)">
              ({staff.employeeId || staff.id})
            </span>
          </div>
          <MetaLine>
            {staff.position && <span>{staff.position}</span>}
            {staff.department && <span>{staff.department}</span>}
            {staff.phone && <span>{staff.phone}</span>}
            {staff.email && <span>{staff.email}</span>}
          </MetaLine>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <div className="flex flex-col items-end gap-1.5">
          {/* Only a real count: an unknown workload shows no pill rather than 0. */}
          {staff.currentWorkload != null && (
            <Badge
              tone={workloadTone(staff.currentWorkload)}
              dot={false}
              className="whitespace-nowrap"
            >
              {t('administration.workload', { count: staff.currentWorkload })}
            </Badge>
          )}
          {onChange && (
            <Button type="button" variant="outline" size="xs" onClick={onChange}>
              {t('administration.changeStaff')}
            </Button>
          )}
        </div>
        {onClear && <ClearButton onClick={onClear} />}
      </div>
    </div>
  );
};

/**
 * The stored id or code of a staff member (or company) whose record could not be looked up (the
 * staff lookup misses usernames and people outside the eligible pool). It is the assignment's own
 * value, so it is shown rather than pretending nothing was chosen.
 */
export const StoredCode = ({
  code,
  name,
  changeLabel,
  onChange,
  onClear,
}: {
  code: string;
  /** Their name when the assignment record carries it: shown as "Name (code)". */
  name?: string | null;
  /** The text of the Change button; "Change" (staff) when left out. */
  changeLabel?: string;
  onChange?: () => void;
  /** Empties the field, so an unresolvable code can still be removed. */
  onClear?: () => void;
}) => {
  const { t } = useTranslation('appraisal');
  const label = personLabel(name, code);
  return (
    <div className={`${selectedCardClass} items-center`}>
      <span className="min-w-0 truncate text-sm font-semibold text-(--palette-ink)" title={label}>
        {label}
      </span>
      <div className="flex shrink-0 items-center gap-2">
        {onChange && (
          <Button type="button" variant="outline" size="xs" onClick={onChange}>
            {changeLabel ?? t('administration.changeStaff')}
          </Button>
        )}
        {onClear && <ClearButton onClick={onClear} />}
      </div>
    </div>
  );
};

export default StaffDisplay;
