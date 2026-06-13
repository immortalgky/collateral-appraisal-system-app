import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import PageLoader from './PageLoader';

/**
 * Renders the routed child (<Outlet/>) inside a Suspense boundary with the
 * shared PageLoader fallback. Used by every app layout so lazy-loaded route
 * chunks have a single, consistent loading state — change the fallback here
 * once instead of in each layout.
 */
function SuspenseOutlet() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Outlet />
    </Suspense>
  );
}

export default SuspenseOutlet;
