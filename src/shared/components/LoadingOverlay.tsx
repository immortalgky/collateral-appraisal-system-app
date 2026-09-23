import { useLoadingStore } from '../store';
import LoadingSpinner from './LoadingSpinner';

const LoadingOverlay = () => {
  // One selector per field, not the whole store: `hideLoading` now writes `pending` on every
  // settle, and subscribing to the object would re-render this on each of them for no change
  // on screen.
  const isLoading = useLoadingStore(s => s.isLoading);
  const message = useLoadingStore(s => s.message);

  if (!isLoading) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-label={message || 'Loading'}
    >
      <div className="bg-white rounded-2xl p-8 shadow-xl">
        <LoadingSpinner size="lg" variant="default" text={message} />
      </div>
    </div>
  );
};

export default LoadingOverlay;
