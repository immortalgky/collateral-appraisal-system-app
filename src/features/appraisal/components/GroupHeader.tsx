import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DisclosureButton } from '@headlessui/react';
import clsx from 'clsx';
import type { PropertyGroup } from '../types';
import Icon from '@shared/components/Icon';
import { PropertyTypeChip } from './PropertyTypeChip';
import { GroupPricingButton } from './GroupPricingButton';
import { GroupActionsMenu } from './GroupActionsMenu';
import { useGroupRename } from '../hooks/useGroupRename';
import { formatAreaNumber, toRaiNganWa } from '../utils/areaFormat';

interface GroupHeaderProps {
  group: PropertyGroup;
  /** Disclosure state, for the caret direction. */
  open: boolean;
  isPma?: boolean;
  readOnly?: boolean;
  isDeletingGroup?: boolean;
  onRenameGroup: (groupId: string, newName: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onGoToPricingAnalysis: (groupId: string) => void;
}

/**
 * The one header every view of a group shares.
 *
 * Two things changed from the old inline header. The pricing state was a bare dollar icon with a
 * coloured dot on it, which said nothing to anyone who had not been told what the dot meant, so
 * it is now a labelled chip. And the delete button used to sit inline between the type badges,
 * one target away from things people click all day; it now lives at the far right and only
 * appears on hover.
 */
export const GroupHeader = ({
  group,
  open,
  isPma = false,
  readOnly = false,
  isDeletingGroup = false,
  onRenameGroup,
  onDeleteGroup,
  onGoToPricingAnalysis,
}: GroupHeaderProps) => {
  const { t } = useTranslation('appraisal');
  const canEdit = !readOnly && !isPma;

  const rename = useGroupRename(group.id, group.name, onRenameGroup);

  /** How many of each property type, in the order the types first appear in the group. */
  const typeBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of group.items) counts.set(item.type, (counts.get(item.type) ?? 0) + 1);
    return [...counts].map(([type, count]) => ({ type, count }));
  }, [group.items]);

  /**
   * Land is measured in wa and structures in square metres, so a group holding both has two
   * totals, not one. Added from the raw figures the API sent — the previous version regex-parsed
   * them back out of the formatted string it had just built.
   *
   * Only the numbers are memoised. Translating inside the memo froze whichever language happened
   * to be loaded when the group first rendered, which on a reload is the English fallback.
   */
  const areaTotals = useMemo(() => {
    let wa = 0;
    let sqm = 0;
    for (const item of group.items) {
      if (item.areaValue == null) continue;
      if (item.areaUnit === 'wa') wa += item.areaValue;
      else sqm += item.areaValue;
    }
    // Literal union, not `string`: the i18n keys are typed, so a typo here is a build error.
    const totals: {
      key: string;
      value: string;
      unitKey: 'properties.units.raiNganWa' | 'properties.units.sqm';
    }[] = [];
    if (wa > 0) {
      totals.push({ key: 'wa', value: toRaiNganWa(wa), unitKey: 'properties.units.raiNganWa' });
    }
    if (sqm > 0) {
      totals.push({ key: 'sqm', value: formatAreaNumber(sqm), unitKey: 'properties.units.sqm' });
    }
    return totals;
  }, [group.items]);

  return (
    <div className="flex h-10 items-center gap-2 border-b border-gray-100 px-3">
      <DisclosureButton className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors shrink-0">
        <Icon
          name="chevron-down"
          className={clsx('text-xs transition-transform duration-200', !open && '-rotate-90')}
          style="solid"
        />
      </DisclosureButton>

      {rename.isEditing && canEdit ? (
        <input
          ref={rename.inputRef}
          value={rename.value}
          onChange={e => rename.setValue(e.target.value)}
          onBlur={rename.commit}
          onKeyDown={rename.onKeyDown}
          className="text-[13px] font-semibold text-gray-900 bg-white border border-primary rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary min-w-0 w-48"
        />
      ) : (
        <h2
          className={clsx(
            'text-[13px] font-semibold text-gray-900 whitespace-nowrap transition-colors',
            canEdit && 'cursor-pointer hover:text-primary',
          )}
          onClick={canEdit ? rename.start : undefined}
          title={canEdit ? t('properties.renameHint') : undefined}
        >
          {group.name}
        </h2>
      )}

      <span className="text-[11px] text-gray-400 whitespace-nowrap tabular-nums">
        {t('properties.itemCount', { n: group.items.length })}
      </span>

      {/* What the group is made of — a dot per type rather than a row of filled badges, so the
          colour reads as a key and the header stops competing with the rows below it. */}
      <div className="flex items-center gap-2.5 min-w-0 overflow-hidden ml-1">
        {typeBreakdown.map(({ type, count }) => (
          <PropertyTypeChip
            key={type}
            code={type}
            variant="dot"
            prefix={<span className="font-semibold tabular-nums">{count}</span>}
          />
        ))}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        {areaTotals.map(total => (
          <span key={total.key} className="text-[11px] text-gray-500 whitespace-nowrap">
            <b className="font-semibold text-gray-700 tabular-nums">{total.value}</b>{' '}
            {t(total.unitKey)}
          </span>
        ))}

        {!isPma && (
          <GroupPricingButton group={group} onGoToPricingAnalysis={onGoToPricingAnalysis} />
        )}

        {canEdit && (
          <GroupActionsMenu
            onRename={rename.start}
            onDelete={() => onDeleteGroup(group.id)}
            isDeleting={isDeletingGroup}
          />
        )}
      </div>
    </div>
  );
};

export default GroupHeader;
