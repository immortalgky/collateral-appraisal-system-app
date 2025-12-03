import { Link } from 'react-router-dom';
import Icon from '@shared/components/Icon';

function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
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

export default NotFoundPage;
