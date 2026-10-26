import { useParams } from 'react-router-dom';
import Icon from '@shared/components/Icon';
import OperationalReportPage from '../components/OperationalReportPage';
import { findReportConfig } from '../config/reports';

/**
 * Thin route component mounted at /reports/operational/:slug.
 * Reads the slug param, looks up the report config, and delegates to
 * the generic OperationalReportPage.
 */
function OperationalReportRoute() {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="size-12 rounded-full bg-(--palette-surface-2) flex items-center justify-center">
          <Icon
            style="solid"
            name="triangle-exclamation"
            className="size-5 text-(--palette-gray-400)"
          />
        </div>
        <p className="text-sm text-(--palette-gray-500)">No report slug provided.</p>
      </div>
    );
  }

  const config = findReportConfig(slug);

  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="size-12 rounded-full bg-(--palette-surface-2) flex items-center justify-center">
          <Icon
            style="solid"
            name="triangle-exclamation"
            className="size-5 text-(--palette-gray-400)"
          />
        </div>
        <p className="text-sm font-medium text-(--palette-ink)">Report not found</p>
        <p className="text-xs text-(--palette-gray-400)">No report configured for slug: {slug}</p>
      </div>
    );
  }

  return <OperationalReportPage key={config.slug} config={config} />;
}

export default OperationalReportRoute;
