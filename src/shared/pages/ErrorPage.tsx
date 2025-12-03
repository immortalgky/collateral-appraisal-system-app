import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';
import Icon from '@shared/components/Icon';

function ErrorPage() {
  const error = useRouteError();

  // Handle 404 errors
  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Icon name="face-sad-tear" style="regular" className="size-24 text-base-300" />
          </div>
          <p className="text-base font-semibold text-primary">404</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-base-content sm:text-5xl">
            Page not found
          </h1>
          <p className="mt-4 text-base text-base-content/60">
            Sorry, we couldn't find the page you're looking for.
          </p>
          <div className="mt-8 flex items-center justify-center gap-x-4">
            <Link to="/" className="btn btn-primary">
              <Icon name="house" style="solid" className="size-4" />
              Go back home
            </Link>
            <Link to="/dev/test" className="btn btn-ghost">
              <Icon name="link" style="solid" className="size-4" />
              Test Links
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Handle other route errors
  if (isRouteErrorResponse(error)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Icon name="circle-exclamation" style="solid" className="size-24 text-warning" />
          </div>
          <p className="text-base font-semibold text-warning">{error.status}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-base-content sm:text-5xl">
            {error.statusText}
          </h1>
          <p className="mt-4 text-base text-base-content/60">
            {error.data?.message || 'An error occurred while processing your request.'}
          </p>
          <div className="mt-8 flex items-center justify-center gap-x-4">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="btn btn-primary"
            >
              <Icon name="arrow-left" style="solid" className="size-4" />
              Go back
            </button>
            <Link to="/" className="btn btn-ghost">
              <Icon name="house" style="solid" className="size-4" />
              Go home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Handle unexpected errors
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <Icon name="triangle-exclamation" style="solid" className="size-24 text-error" />
        </div>
        <p className="text-base font-semibold text-error">Error</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-base-content sm:text-5xl">
          Something went wrong
        </h1>
        <p className="mt-4 text-base text-base-content/60 max-w-md mx-auto">
          An unexpected error occurred. Please try refreshing the page.
        </p>
        <div className="mt-4 p-4 bg-error/10 rounded-lg max-w-lg mx-auto">
          <p className="text-sm text-error font-mono break-all">{errorMessage}</p>
        </div>
        <div className="mt-8 flex items-center justify-center gap-x-4">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            <Icon name="rotate-right" style="solid" className="size-4" />
            Refresh page
          </button>
          <Link to="/" className="btn btn-ghost">
            <Icon name="house" style="solid" className="size-4" />
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ErrorPage;
