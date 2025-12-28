import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';

interface RightMenuPortalContextValue {
  /** The DOM element to portal into */
  portalTarget: HTMLElement | null;
  /** Whether the right menu is visible */
  isOpen: boolean;
  /** Toggle the right menu visibility */
  onToggle: () => void;
  /** Whether any content has been registered for the portal */
  hasContent: boolean;
  /** Register that content is being rendered */
  registerContent: () => void;
  /** Unregister content */
  unregisterContent: () => void;
}

const RightMenuPortalContext = createContext<RightMenuPortalContextValue | null>(null);

interface RightMenuPortalProviderProps {
  children: ReactNode;
  /** The ref to the portal target element */
  portalRef: React.RefObject<HTMLDivElement | null>;
  /** Whether the right menu is open */
  isOpen: boolean;
  /** Toggle callback */
  onToggle: () => void;
}

/**
 * Provider for the right menu portal system.
 * Must be placed at layout level to provide portal target.
 */
export function RightMenuPortalProvider({
  children,
  portalRef,
  isOpen,
  onToggle,
}: RightMenuPortalProviderProps) {
  const [hasContent, setHasContent] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  // Update portal target when ref changes
  useEffect(() => {
    const checkRef = () => {
      if (portalRef.current && portalRef.current !== portalTarget) {
        setPortalTarget(portalRef.current);
      }
    };

    checkRef();

    // Also check on next frame in case ref wasn't attached yet
    const frameId = requestAnimationFrame(checkRef);
    return () => cancelAnimationFrame(frameId);
  }, [portalRef, portalTarget]);

  // Stable callbacks to prevent infinite loops
  const registerContent = useCallback(() => setHasContent(true), []);
  const unregisterContent = useCallback(() => setHasContent(false), []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      portalTarget,
      isOpen,
      onToggle,
      hasContent,
      registerContent,
      unregisterContent,
    }),
    [portalTarget, isOpen, onToggle, hasContent, registerContent, unregisterContent],
  );

  return (
    <RightMenuPortalContext.Provider value={contextValue}>
      {children}
    </RightMenuPortalContext.Provider>
  );
}

/**
 * Hook to access the right menu portal context.
 * Returns null if used outside of RightMenuPortalProvider.
 */
export function useRightMenuPortal(): RightMenuPortalContextValue | null {
  return useContext(RightMenuPortalContext);
}

/**
 * Hook to get the onClose callback for right menu components.
 * Returns undefined if not in portal context.
 */
export function useRightMenuClose(): (() => void) | undefined {
  const context = useContext(RightMenuPortalContext);
  return context?.onToggle;
}
