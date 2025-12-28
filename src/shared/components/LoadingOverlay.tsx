import { useLoadingStore } from '../store';
import LoadingSpinner from './LoadingSpinner';

const LoadingOverlay = () => {
  const { isLoading, message } = useLoadingStore();

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
