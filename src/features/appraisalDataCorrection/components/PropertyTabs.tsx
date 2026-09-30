import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useFormContext, useFormState, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import BuildingDetailForm from '@/features/appraisal/forms/BuildingDetailForm';
import CondoDetailForm from '@/features/appraisal/forms/CondoDetailForm';
import LandDetailForm from '@/features/appraisal/forms/LandDetailForm';
import LeaseAgreementForm from '@/features/appraisal/forms/LeaseAgreementForm';
import MachineryDetailForm from '@/features/appraisal/forms/MachineryDetailForm';
import RentalInfoForm from '@/features/appraisal/forms/RentalInfoForm';
import TitleDeedForm from '@/features/appraisal/forms/TitleDeedForm';
import { EditorTabBar, type EditorTab } from '@/features/appraisal/components/EditorIdentityCard';
import { countFailedIn, panelHasField } from '@/features/appraisal/components/PropertyEditorHeader';
import { ConstructionEditorSection } from '@/features/appraisal/components/construction/ConstructionEditorSection';
import { useConstructionTab } from '@/features/appraisal/hooks/useConstructionTab';
import { flattenFormErrors, scrollToField } from '@/shared/components/form';
import ResizableSidebar from '@/shared/components/ResizableSidebar';
import Section from '@/shared/components/sections/Section';

/**
 * The body of a property editor: the property pages' own tab bar over their own panels.
 *
 * Panels are the pages' markup, id for id (`land-section`, `lease-agreement-section` …), because
 * the shared form styles and the error counting both find them by those ids. Every panel stays
 * mounted and is only hidden, so switching tabs never resets what was typed.
 */

export type PanelId =
  | 'land'
  | 'building'
  | 'condo'
  | 'machinery'
  | 'construction'
  | 'lease-agreement'
  | 'rental-info';

/** What the arrangement needs to know about the property on screen. */
export interface EditorContext {
  propertyId: string;
  /** Progressive appraisal (an inspection round): locks the inspection's method switch. */
  ciMode: boolean;
  /** The construction tab's building switcher: another building in this appraisal was picked. */
  onSelectProperty: (propertyId: string) => void;
}

/** Which tabs a property type has, in the order its page shows them. */
export interface TabLayout {
  panels: PanelId[];
  /** `propertyType` the page passes its land form ('LB' / 'LS'); absent for land alone. */
  landType?: 'LB' | 'LS';
  buildingType?: 'LB' | 'LS';
  /** The inspection belongs to a condo unit rather than a house. */
  condo?: boolean;
  /** Lease and rental tabs exist only while `isRentedOut` is on (land, land-and-building). */
  rentedOutOnly?: boolean;
}

// Typed as plain strings on purpose: threading i18next's overloaded `t` through a keyed lookup is
// what has made tsc crash here before (see FormSectionHeader).
const TAB_LABEL_KEY: Record<Exclude<PanelId, 'machinery'>, string> = {
  land: 'createPage.navLand',
  building: 'createPage.navBuilding',
  condo: 'createPage.navCondo',
  construction: 'createPage.navConstructionInspection',
  'lease-agreement': 'createPage.navLeaseAgreement',
  'rental-info': 'createPage.navRentalInfo',
};

/** The frame the pages put every editor body in; its side panel is never opened here. */
export const PropertyBodyFrame = ({ children }: { children: ReactNode }) => (
  <ResizableSidebar isOpen={false} onToggle={() => undefined} openedWidth="w-1/5">
    <ResizableSidebar.Main>{children}</ResizableSidebar.Main>
  </ResizableSidebar>
);

const isLeasePanel = (id: PanelId) => id === 'lease-agreement' || id === 'rental-info';

export function PropertyTabs({ layout, context }: { layout: TabLayout; context: EditorContext }) {
  const { t } = useTranslation('appraisal');
  const methods = useFormContext();
  const { control } = methods;
  const isUnderConstruction = useWatch({ control, name: 'isUnderConstruction' });
  const isRentedOut = useWatch({ control, name: 'isRentedOut' });
  const { errors, submitCount } = useFormState({ control });

  const first = layout.panels[0];
  const [activeTab, setActiveTab] = useState<PanelId>(first);

  // The pages' own rule for the construction tab: present only while under construction.
  const { shownTab: afterConstruction, hasTab: hasConstructionTab } = useConstructionTab<PanelId>({
    methods,
    isUnderConstruction,
    activeTab,
    setActiveTab,
    fallbackTab: first,
    isCreateMode: false,
    isCiAppraisal: context.ciMode,
  });

  const visible = layout.panels.filter(id => {
    if (id === 'construction') return hasConstructionTab;
    if (isLeasePanel(id) && layout.rentedOutOnly) return !!isRentedOut;
    return true;
  });
  // A tab that went away (rental switched off while on it) hands the view back to the first.
  const shown = visible.includes(afterConstruction) ? afterConstruction : first;

  const failed = flattenFormErrors(errors);
  const tabs: EditorTab[] = visible.map(id => ({
    id,
    label: id === 'machinery' ? '' : String(t(TAB_LABEL_KEY[id] as never)),
    errorCount: failed.length > 0 ? countFailedIn(`${id}-section`, failed) : 0,
  }));

  // After a failed save, bring a failed field into view: stay on this tab if it has one, otherwise
  // open the first tab that does and scroll once it is showing. The property pages do the same
  // from their header (PropertyEditorHeader), which carries photos and navigation this screen has
  // no use for.
  const pendingScroll = useRef<string | null>(null);
  useEffect(() => {
    if (!submitCount || visible.length < 2) return;
    const failedNow = flattenFormErrors(errors);
    const here = failedNow.find(f => panelHasField(`${shown}-section`, f.path));
    if (here) {
      requestAnimationFrame(() => scrollToField(here.path));
      return;
    }
    for (const f of failedNow) {
      const target = visible.find(id => panelHasField(`${id}-section`, f.path));
      if (!target) continue;
      pendingScroll.current = f.path;
      setActiveTab(target);
      return;
    }
    // Only on the submit that produced the errors, not on every keystroke that clears one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitCount]);
  useEffect(() => {
    const path = pendingScroll.current;
    if (!path) return;
    pendingScroll.current = null;
    const frame = requestAnimationFrame(() => scrollToField(path));
    return () => cancelAnimationFrame(frame);
  }, [activeTab]);

  const hidden = (id: PanelId) => (shown === id ? '' : 'hidden');

  const renderPanel = (id: PanelId): ReactNode => {
    switch (id) {
      case 'land':
        return (
          <div
            key={id}
            id="land-section"
            className={`flex flex-col gap-6 min-w-0 max-w-full ${hidden(id)}`}
          >
            <Section id="land-title" anchor className="flex flex-col gap-6 min-w-0 overflow-hidden">
              <TitleDeedForm />
            </Section>
            <Section id="land-info" anchor className="flex flex-col gap-6 min-w-0 overflow-hidden">
              <LandDetailForm propertyType={layout.landType} />
            </Section>
          </div>
        );
      case 'building':
        return (
          <div key={id} id="building-section" className={`flex flex-col gap-6 ${hidden(id)}`}>
            <Section id="building-info" anchor className="flex flex-col gap-6">
              <BuildingDetailForm propertyType={layout.buildingType} />
            </Section>
          </div>
        );
      case 'condo':
        return (
          <div key={id} id="condo-section" className={`flex flex-col gap-6 ${hidden(id)}`}>
            <Section id="condo-info" anchor className="flex flex-col gap-6 min-w-0 overflow-hidden">
              <CondoDetailForm />
            </Section>
          </div>
        );
      case 'machinery':
        return (
          <Section
            key={id}
            id="machinery"
            anchor
            className="flex flex-col gap-6 min-w-0 overflow-hidden"
          >
            <MachineryDetailForm />
          </Section>
        );
      case 'construction':
        // Always mounted, as on the pages: the clear-data guard lives in it. It hides its own
        // section unless `shownTab` is 'construction'.
        return (
          <ConstructionEditorSection
            key={id}
            shownTab={shown}
            underConstruction={hasConstructionTab}
            readOnly={false}
            ciMode={context.ciMode}
            condo={!!layout.condo}
            propertyId={context.propertyId}
            onSelectProperty={context.onSelectProperty}
          />
        );
      case 'lease-agreement':
      case 'rental-info': {
        if (layout.rentedOutOnly && !isRentedOut) return null;
        const isLease = id === 'lease-agreement';
        return (
          <div
            key={id}
            id={`${id}-section`}
            className={`flex flex-col gap-6 min-w-0 max-w-full ${hidden(id)}`}
          >
            <Section anchor className="min-w-0 overflow-hidden">
              {isLease ? (
                <LeaseAgreementForm namePrefix="leaseAgreement" />
              ) : (
                <RentalInfoForm namePrefix="rentalInfo" />
              )}
            </Section>
          </div>
        );
      }
    }
  };

  return (
    <>
      {visible.length > 1 && (
        <EditorTabBar
          tabs={tabs}
          activeId={shown}
          label={t('editorHeader.tabsLabel')}
          onSelect={id => setActiveTab(id as PanelId)}
        />
      )}
      <PropertyBodyFrame>
        <div className="flex-auto flex flex-col gap-6 min-w-0">
          {layout.panels.map(renderPanel)}
        </div>
      </PropertyBodyFrame>
    </>
  );
}
