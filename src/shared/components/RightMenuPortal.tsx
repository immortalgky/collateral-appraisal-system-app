import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useRightMenuPortal } from '@shared/contexts/RightMenuPortalContext';

interface RightMenuPortalProps {
  children: ReactNode;
}

/**
 * Portal component for rendering right menu content.
 * Place this component inside your page (within FormProvider if needed)
 * and it will render its children into the layout's right menu slot.
 *
 * @example
 * ```tsx
 * function MyPage() {
 *   return (
 *     <FormProvider {...methods}>
 *       <RightMenuPortal>
 *         <RequestRightMenu />
 *       </RightMenuPortal>
 *       <div>Page content...</div>
 *     </FormProvider>
 *   );
 * }
 * ```
 */
export function RightMenuPortal({ children }: RightMenuPortalProps) {
  const context = useRightMenuPortal();

  // Register/unregister content on mount/unmount
  // Use stable callback references from context
  useEffect(() => {
    if (context) {
      context.registerContent();
      return () => context.unregisterContent();
    }
  }, [context?.registerContent, context?.unregisterContent]);

  // Don't render if no context or no portal target
  if (!context?.portalTarget || !context.isOpen) {
    return null;
  }

  return createPortal(children, context.portalTarget);
}

export default RightMenuPortal;
