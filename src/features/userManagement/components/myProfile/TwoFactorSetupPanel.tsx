import { Fragment } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import { copyToClipboard } from '@shared/utils/clipboard';
import type { TwoFactorSetupResponse } from '../../types';

/**
 * The QR code and the same key as text, for an authenticator app. The SVG comes from our own API
 * and is rendered through <img>, which never runs scripts inside it.
 */
const TwoFactorSetupPanel = ({ setup }: { setup: TwoFactorSetupResponse }) => {
  const { t } = useTranslation(['userManagement']);

  const copyKey = () =>
    copyToClipboard(
      setup.sharedKey,
      () => toast.success(t('twoFactor.enable.keyCopied')),
      () => toast.error(t('twoFactor.recovery.copyFailed')),
    );

  return (
    <div className="flex flex-col gap-3">
      <img
        src={`data:image/svg+xml;utf8,${encodeURIComponent(setup.qrSvg)}`}
        alt={t('twoFactor.enable.qrAlt')}
        className="mx-auto size-44 rounded-lg border border-gray-200 bg-white p-2"
      />
      <div>
        <span className="block text-xs font-medium text-gray-700 mb-1">
          {t('twoFactor.enable.manualKey')}
        </span>
        <div className="flex items-stretch gap-2">
          {/* Each space-separated group stays whole: lines break only between groups. */}
          <code className="flex-1 font-mono text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-2 select-all">
            {setup.sharedKey.split(' ').map((group, i) => (
              <Fragment key={i}>
                {i > 0 && ' '}
                <span className="whitespace-nowrap">{group}</span>
              </Fragment>
            ))}
          </code>
          <button
            type="button"
            onClick={copyKey}
            aria-label={t('twoFactor.enable.copyKey')}
            title={t('twoFactor.enable.copyKey')}
            className="shrink-0 px-3 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Icon name="copy" style="regular" className="size-4!" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorSetupPanel;
