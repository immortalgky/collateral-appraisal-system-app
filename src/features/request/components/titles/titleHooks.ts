import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useParametersByGroup } from '@/shared/utils/parameterUtils';
import {
  makeDopaAddressFields,
  makeTitleAddressFields,
  makeTitleBuildingFields,
  makeTitleCondoFields,
  makeTitleInfoFields,
  makeTitleLandFields,
  makeTitleMachineFields,
  makeTitleVehicleFields,
  makeTitleVesselFields,
} from '../../configs/fields';
import type { RequestTitleDtoType } from '../../schemas/form';
import { missingFieldPaths } from '../../utils/titleList';

/** The title's own fields as text, without its documents (those are summarised separately). */
const fieldsSignature = (title: RequestTitleDtoType) =>
  JSON.stringify(title, (key, value) => (key === 'documents' ? undefined : value));

/**
 * What each title lacks, for the whole list at once.
 *
 * Every title is checked against the Save schema, which is not free at 150 rows, so the answer is
 * kept by the title's own fields: editing one title re-checks that one, and a document upload
 * (which rewrites a title's `documents`, not its fields) re-checks nothing. The cache is rebuilt
 * from the current titles every time, so it never holds more than the list does.
 *
 * `sigs` is what a row is re-rendered on: the title's own fields. A row shows nothing of its files,
 * so a document upload leaves it as it is.
 */
export function useTitleStatus(titles: readonly RequestTitleDtoType[]) {
  const cache = useRef(new Map<string, string[]>());
  return useMemo(() => {
    const next = new Map<string, string[]>();
    const sigs: string[] = [];
    const missing = titles.map(title => {
      const fields = fieldsSignature(title);
      sigs.push(fields);
      const found = cache.current.get(fields) ?? missingFieldPaths(title);
      next.set(fields, found);
      return found;
    });
    cache.current = next;
    return { sigs, missing };
  }, [titles]);
}

/**
 * A field's label from its dotted form path (`titleAddress.subDistrict`), taken from the same
 * configs the drawer renders so the "still missing" list names fields as the form does. The two
 * addresses share their labels, so those get a short tag saying which one is meant.
 */
export function useMissingFieldLabel() {
  const { t } = useTranslation('request');
  return useMemo(() => {
    const labels = new Map<string, string>();
    const configs = [
      makeTitleInfoFields(t),
      makeTitleLandFields(t),
      makeTitleBuildingFields(t),
      makeTitleCondoFields(t),
      makeTitleVehicleFields(t),
      makeTitleVesselFields(t),
      makeTitleMachineFields(t),
      makeTitleAddressFields(t),
      makeDopaAddressFields(t),
    ];
    for (const config of configs)
      for (const field of config)
        if (field.label && !labels.has(field.name)) labels.set(field.name, field.label);

    return (path: string) => {
      const label = labels.get(path) ?? path;
      if (path.startsWith('titleAddress.'))
        return `${label} (${t('titleSection.address.tagTitle')})`;
      if (path.startsWith('dopaAddress.')) return `${label} (${t('titleSection.address.tagDopa')})`;
      return label;
    };
  }, [t]);
}

/** The name the parameter table gives a collateral code, or the code until the table has loaded. */
export function useCollateralTypeName() {
  const params = useParametersByGroup('CollateralType');
  return useCallback(
    (code: string) => params.find(p => p.code === code)?.description ?? code,
    [params],
  );
}

const NO_TITLES: RequestTitleDtoType[] = [];

/**
 * The titles for the list, which stand still while the editor is open.
 *
 * Typing in the editor changes the open title on every key, and the list behind it has up to a
 * hundred and fifty rows: re-rendering them per keystroke is what made typing slow. So while
 * `paused` the list keeps the titles as they were when the editor opened and catches up when it
 * closes. `anchor` (the open title's index) lets it catch up sooner for the one thing that must not
 * wait: a title added from inside the editor ("save and add next") has to be in the list for the
 * editor to reach it.
 *
 * Reads through the form's own `watch` subscription. Each title is copied one level deep, so a row
 * sees a new object whenever the list refreshes.
 */
export function useTitlesSnapshot(paused: boolean, anchor?: number) {
  const { watch, getValues } = useFormContext();
  const read = useCallback(() => {
    const live = getValues('titles') as RequestTitleDtoType[] | undefined;
    return live ? live.map(title => ({ ...title })) : NO_TITLES;
  }, [getValues]);
  const [titles, setTitles] = useState(read);

  // Follow the form whenever the editor is not open; one fresh read as it closes (or on mount).
  useEffect(() => {
    if (paused) return;
    setTitles(read());
    const subscription = watch((_values, { name }) => {
      if (!name || name === 'titles' || name.startsWith('titles.')) setTitles(read());
    });
    return () => subscription.unsubscribe();
  }, [paused, read, watch]);

  useEffect(() => {
    if (!paused) return;
    const live = (getValues('titles') as unknown[] | undefined)?.length ?? 0;
    if (live !== titles.length) setTitles(read());
    // `titles` is deliberately not a dependency: this only asks "did the count change" when the
    // editor moves to another title.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, anchor]);

  return titles;
}

/**
 * The same array while its contents are unchanged. The list's row indices are rebuilt from the
 * titles on every refresh; handing the table a fresh array each time would make every row's
 * sortable wrapper re-render though no row moved.
 */
export function useStableList<T>(list: readonly T[]): readonly T[] {
  const ref = useRef(list);
  if (
    ref.current !== list &&
    (ref.current.length !== list.length || ref.current.some((item, i) => item !== list[i]))
  ) {
    ref.current = list;
  }
  return ref.current;
}
