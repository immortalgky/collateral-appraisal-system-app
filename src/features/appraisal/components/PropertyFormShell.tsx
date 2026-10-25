import type { ReactNode, Ref } from 'react';
import { useFormLayout } from '@/shared/components/form';
import { FormShell } from './FormShell';
import { PropertyEditorHeader } from './PropertyEditorHeader';
import PropertyPhotoSection, { type PropertyPhotoSectionRef } from './PropertyPhotoSection';
import type { EditorTab } from './EditorTabBar';

interface PropertyFormShellProps {
  appraisalId?: string;
  /** Absent while the property is being created. */
  propertyId?: string;
  /** The form's property type code, e.g. 'L' or 'LB'. */
  typeCode: string;
  /** Absent on the PMA editors, which carry no photos: no photo card, no photo strip. */
  photoSectionRef?: Ref<PropertyPhotoSectionRef>;
  /** A PMA property, see `PropertyEditorHeader`. */
  pma?: boolean;
  /** Beside the name in the identity row, e.g. the PMA sync status. */
  meta?: ReactNode;
  tabs: EditorTab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  /** The tab panels. A panel that is not showing carries the `hidden` class and is left out of the TOC. */
  children: ReactNode;
}

// `--form-scroll-offset` is the pinned tab row's height: FormSection scrolls to land under it.
const SCROLL_OFFSET = { standard: '2.5714rem', compact: '2.4286rem' };

/**
 * The page shell of every property form (DESIGN.md 17.8): `FormShell` with the identity row and the
 * pinned tabs (`PropertyEditorHeader`) as its header and the property's photo section.
 *
 * It renders only the scroller; the page keeps its `<form>`, the `ActionBar` and its dialogs.
 */
export function PropertyFormShell({
  appraisalId,
  propertyId,
  typeCode,
  photoSectionRef,
  pma,
  meta,
  tabs,
  activeTab,
  onTabChange,
  children,
}: PropertyFormShellProps) {
  const layout = useFormLayout();
  return (
    <FormShell
      pinnedHeight={SCROLL_OFFSET[layout]}
      activeTab={activeTab}
      header={
        <PropertyEditorHeader
          appraisalId={appraisalId}
          propertyId={propertyId}
          typeCode={typeCode}
          pma={pma}
          meta={meta}
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={onTabChange}
        />
      }
      photos={
        appraisalId && photoSectionRef
          ? renderGallery => (
              <PropertyPhotoSection
                ref={photoSectionRef}
                appraisalId={appraisalId}
                propertyId={propertyId}
                renderGallery={renderGallery}
              />
            )
          : undefined
      }
    >
      {children}
    </FormShell>
  );
}
