import { useEffect, useMemo, useRef, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import Section from '@/shared/components/sections/Section';
import { ConstructionInspectionTab } from '../tabs/ConstructionInspectionTab';
import { ConstructionClearGuard } from './ConstructionClearGuard';
import { hasConstructionData } from './constructionGrid';
import { ConstructionScopeContext } from './constructionScope';

interface ConstructionEditorSectionProps {
  shownTab: string;
  /** The page's own Under Construction flag (it already watches it). */
  underConstruction: boolean;
  readOnly: boolean;
  ciMode: boolean;
  /** Required so every editor says which it is — a condo has no value base of its own. */
  condo: boolean;
}

/**
 * The construction tab's body and its clear-data guard, as every property editor with a building
 * places them. Rendered inside the page's form so both read the form context.
 */
export function ConstructionEditorSection({
  shownTab,
  underConstruction,
  readOnly,
  ciMode,
  condo,
}: ConstructionEditorSectionProps) {
  const { control } = useFormContext();
  // Mounted while under construction, and while switched off with construction data still on the
  // form (until saved), so the tab keeps its state behind the clear-data dialog. Derived, not
  // latched, so it follows the property on screen; one never under construction does not pay for
  // the tab. `compute` re-renders only when the answer changes, not on every keystroke.
  const mounted = useWatch({
    control,
    compute: values => !!values.isUnderConstruction || hasConstructionData(values),
  });

  // This property's scope (see constructionScope). Set in the effect body, not only at creation:
  // StrictMode runs cleanup then the effect again in development, and must end up active.
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const [uploading, setUploading] = useState(false);
  const scope = useMemo(
    () => ({ isActive: () => active.current, uploading, setUploading }),
    [uploading],
  );

  return (
    <ConstructionScopeContext.Provider value={scope}>
      <ConstructionClearGuard />
      {mounted && (
        <div
          id="construction-section"
          className={`flex flex-col gap-6 ${shownTab !== 'construction' ? 'hidden' : ''}`}
        >
          <Section
            id="construction-info"
            anchor={underConstruction}
            className="flex flex-col gap-6"
          >
            <ConstructionInspectionTab readOnly={readOnly} ciMode={ciMode} condo={condo} />
          </Section>
        </div>
      )}
    </ConstructionScopeContext.Provider>
  );
}
