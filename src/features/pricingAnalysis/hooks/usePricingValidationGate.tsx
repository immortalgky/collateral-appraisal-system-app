import { useCallback, useState } from 'react';
import { PricingValidationModal } from '../components/PricingValidationModal';
import type { GroupPropertyRef } from '@features/appraisal/hooks/usePropertyGroupMandatoryValidation';

export interface PricingValidationContext {
  groupId: string;
  /** Appraisal context, for the front-end mandatory-field checks. */
  appraisalId: string | undefined;
  /** Properties in the group, for the front-end mandatory-field checks. */
  properties: GroupPropertyRef[];
}

interface GateState {
  context: PricingValidationContext | null;
  onPass: (() => void) | null;
}

/**
 * Plug-and-play gate that validates a property group before allowing pricing analysis.
 *
 * Usage:
 *   const { open, modal } = usePricingValidationGate();
 *   // render {modal} once in the component tree
 *   // call open({ groupId, appraisalId, properties }, () => navigate(...))
 *
 * The onPass callback runs only when every validation rule passes. Reusable anywhere
 * pricing analysis can be triggered (property group page today, ModelListingTab later).
 */
export function usePricingValidationGate() {
  const [state, setState] = useState<GateState>({ context: null, onPass: null });

  const open = useCallback((context: PricingValidationContext, onPass: () => void) => {
    setState({ context, onPass });
  }, []);

  const close = useCallback(() => {
    setState({ context: null, onPass: null });
  }, []);

  const handleAllPassed = useCallback(() => {
    setState(prev => {
      prev.onPass?.();
      return { context: null, onPass: null };
    });
  }, []);

  const modal = (
    <PricingValidationModal
      isOpen={state.context !== null}
      groupId={state.context?.groupId}
      appraisalId={state.context?.appraisalId}
      properties={state.context?.properties ?? []}
      onClose={close}
      onAllPassed={handleAllPassed}
    />
  );

  return { open, close, modal };
}

export default usePricingValidationGate;
