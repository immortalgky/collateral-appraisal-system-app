import { useEffect, useLayoutEffect, useRef } from 'react';
import type { UseFormReturn } from 'react-hook-form';

interface UseConstructionTabOptions<T extends string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  methods: UseFormReturn<any>;
  isUnderConstruction: boolean | undefined;
  activeTab: T;
  setActiveTab: (tab: T) => void;
  /** The editor's first tab, shown whenever the construction tab does not exist. */
  fallbackTab: T;
  isCreateMode: boolean;
  isCiAppraisal: boolean;
}

/**
 * The construction tab of a property editor: it exists only while the property is under
 * construction, because the API deletes the inspection whenever the property is saved as not under
 * construction. Returns the tab to show.
 */
export function useConstructionTab<T extends string>({
  methods,
  isUnderConstruction,
  activeTab,
  setActiveTab,
  fallbackTab,
  isCreateMode,
  isCiAppraisal,
}: UseConstructionTabOptions<T>): { shownTab: T; hasTab: boolean } {
  // A new property on a progressive round is there to be inspected; the form defaults to No, which
  // hid the tab the inspector came for. Once, so a user who switches it off keeps their choice.
  // Retried after every render until it takes: resetField skips a field not registered yet (the
  // page may still be on its loading screen), and only resetField also moves the default.
  const defaulted = useRef(false);
  const answered = useRef(false);
  useLayoutEffect(() => {
    if (defaulted.current || !isCreateMode || !isCiAppraisal) return;
    // The appraisal type can resolve after the user has already answered the question — even with
    // the value it started at, which isDirty cannot see; the toggle's own change event can.
    if (answered.current) {
      defaulted.current = true;
      return;
    }
    methods.resetField('isUnderConstruction', { defaultValue: true });
    if (methods.getValues('isUnderConstruction') === true) defaulted.current = true;
  });

  // A ?tab=construction link to a building that is not under construction leaves activeTab on a tab
  // that is not there. When the user then switches it on from the form they are editing, stay on
  // that form. The watch callback runs inside the toggle's onChange (`type === 'change'`), so the
  // tab is corrected in the same render and never flashes up; loads and resets report no type.
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  useEffect(() => {
    const subscription = methods.watch((values, { name, type }) => {
      if (name !== 'isUnderConstruction' || type !== 'change') return;
      answered.current = true;
      if (values.isUnderConstruction === true && activeTabRef.current === 'construction')
        setActiveTab(fallbackTab);
    });
    return () => subscription.unsubscribe();
  }, [methods, setActiveTab, fallbackTab]);

  // Derived rather than reset in an effect: the form reads No until the property loads, and an
  // effect firing then threw away a ?tab=construction link.
  return {
    shownTab: activeTab === 'construction' && !isUnderConstruction ? fallbackTab : activeTab,
    // The tab exists only while under construction: the API deletes the inspection whenever the
    // property is saved as not under construction, so a tab shown for "No" was lost on save.
    hasTab: !!isUnderConstruction,
  };
}
