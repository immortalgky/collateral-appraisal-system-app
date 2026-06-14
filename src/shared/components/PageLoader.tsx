import LoadingSpinner from './LoadingSpinner';

/**
 * Suspense fallback for lazy-loaded route chunks. Fills the available area and
 * centers the shared LoadingSpinner so the app shell (sidebar/navbar) stays
 * visible while a page chunk is fetched on first navigation.
 */
function PageLoader() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}

export default PageLoader;
