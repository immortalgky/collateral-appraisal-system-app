import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import { API_URL } from '@/config';

// Hangfire renders its own dashboard; this page embeds it instead of rebuilding it. The frame
// authenticates with the Identity cookie the browser already holds from login, so no token is passed
// here — and the API only allows this origin to embed it (the frame-ancestors header comes from
// UseHangfireDashboardFraming, called above UseRouting in the backend's Program.cs).
const DASHBOARD_URL = `${API_URL}/hangfire`;

export default function HangfireDashboardPage() {
  const { t } = useTranslation('hangfire');

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{t('page.title')}</h3>
          <p className="mt-0.5 text-xs text-gray-500">{t('page.subtitle')}</p>
        </div>
        {/* Escape hatch: when the login cookie has expired the dashboard answers with a redirect to
            the login page, which refuses to be framed — so the frame shows an error. Opening the same
            URL as an ordinary tab goes through the login page and back. */}
        <a
          href={DASHBOARD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          <Icon name="arrow-up-right-from-square" style="solid" className="h-3 w-3" />
          {t('actions.openInNewTab')}
        </a>
      </div>

      <iframe
        src={DASHBOARD_URL}
        title={t('page.title')}
        // allow-modals: Hangfire confirms "delete job" / "requeue" with window.confirm.
        // allow-top-navigation is deliberately absent, so the dashboard cannot navigate the app away.
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
        className="w-full flex-1 min-h-0 rounded-lg border border-gray-200 bg-white"
      />

      {/* A framing error inside the iframe explains nothing to the user, and the browser will not
          let us detect it, so the remedy is stated up front. */}
      <p className="shrink-0 text-xs text-gray-400">{t('page.frameHint')}</p>
    </div>
  );
}
