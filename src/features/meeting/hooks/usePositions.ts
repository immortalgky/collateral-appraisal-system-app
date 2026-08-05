/**
 * Single source for the committee/meeting POSITION dropdowns.
 *
 * Which positions are offered comes from the `MeetingPosition` general-parameter group, so the list
 * can be changed without a release. The visible label comes from i18n rather than the parameter's
 * description: `parameter.Parameters` only carries EN and TH rows, while the app also ships ZH, and
 * the `meeting:position.*` keys already cover all three.
 */
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useParametersByGroup } from '@/shared/utils/parameterUtils';
import type { CommitteeMemberPosition } from '../api/types';
import { MEETING_POSITION_PARAMETER_GROUP, SELECTABLE_POSITIONS } from '../constants';

const ASSIGNABLE = new Set<string>(SELECTABLE_POSITIONS);

const isAssignable = (code: string): code is CommitteeMemberPosition => ASSIGNABLE.has(code);

/**
 * The positions a user may assign, in `seqno` order.
 *
 * Codes are filtered against `SELECTABLE_POSITIONS`, NOT the full `POSITION_OPTIONS` enum union.
 * The parameter group is admin-editable, so it can be used to *narrow* the list (deactivate `UW`
 * and the dropdown drops to three) but never to widen it back onto a retired position: the zod
 * schemas and the API both reject those, so offering one would present a choice that cannot be
 * saved. Dropdown ⊆ zod enum ⊆ backend `CommitteeMemberPositions.Selectable`, by construction.
 *
 * Falls back to the full selectable set when the group has not been seeded, so the dropdown is
 * never empty.
 */
export function useSelectablePositions(): CommitteeMemberPosition[] {
  const parameters = useParametersByGroup(MEETING_POSITION_PARAMETER_GROUP);

  return useMemo(() => {
    const fromParameters = parameters
      .filter(p => p.isActive !== false)
      .map(p => p.code)
      .filter((code): code is CommitteeMemberPosition => !!code && isAssignable(code));

    return fromParameters.length > 0 ? fromParameters : [...SELECTABLE_POSITIONS];
  }, [parameters]);
}

/**
 * Resolves a position code to a display label: the `meeting:position.*` translation when one
 * exists, else the parameter's description, else the raw code. The last two keep retired values
 * (Risk / Appraisal / Credit / Member) and any newly added code readable rather than blank.
 */
export function usePositionLabel(): (position: string) => string {
  const { t } = useTranslation('meeting');
  const parameters = useParametersByGroup(MEETING_POSITION_PARAMETER_GROUP);

  return useCallback(
    (position: string) => {
      if (!position) return '';

      const key = `position.${position}`;
      const translated = t(key, { defaultValue: '' });
      if (translated) return translated;

      return parameters.find(p => p.code === position)?.description ?? position;
    },
    [t, parameters],
  );
}
