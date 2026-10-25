import type { ComponentProps, ReactNode, Ref } from 'react';
import { FormShell } from './FormShell';
import MarketComparablePhotoSection, {
  type MarketComparablePhotoSectionRef,
} from './MarketComparablePhotoSection';

interface ComparableFormShellProps {
  /** Photos only exist inside an appraisal; without one there is no rail and no strip. */
  appraisalId?: string;
  /** Absent while the comparable is being created, including from a copy. */
  marketComparableId?: string;
  /** The photos the form was filled from (this comparable, or the one being copied). */
  images?: ComponentProps<typeof MarketComparablePhotoSection>['images'];
  photoSectionRef: Ref<MarketComparablePhotoSectionRef>;
  /** `EditorHeader`. It must sit directly in the scroller: its section bar is sticky inside it. */
  header: ReactNode;
  children: ReactNode;
}

// The pinned section bar's height: FormSection scrolls to land under it.
const SECTION_BAR_HEIGHT = '2.5714rem';

/**
 * The page shell of the market comparable editor: `FormShell` (DESIGN.md 17.8) with the section bar
 * as its header, the comparable's photo section, and no table of contents (the bar is the contents).
 *
 * It renders only the scroller; the page keeps its `<form>`, the `ActionBar` and its dialogs.
 */
export function ComparableFormShell({
  appraisalId,
  marketComparableId,
  images,
  photoSectionRef,
  header,
  children,
}: ComparableFormShellProps) {
  return (
    <FormShell
      header={header}
      pinnedHeight={SECTION_BAR_HEIGHT}
      toc={false}
      photos={
        appraisalId
          ? renderGallery => (
              <MarketComparablePhotoSection
                ref={photoSectionRef}
                appraisalId={appraisalId}
                marketComparableId={marketComparableId}
                images={images}
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
