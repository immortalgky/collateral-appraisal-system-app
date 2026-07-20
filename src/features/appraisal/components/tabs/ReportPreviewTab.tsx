import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import { useAppraisalContext } from '../../context/AppraisalContext';
import { useReportPreviewStore } from '../../store/reportPreviewStore';

/**
 * Renders the REAL appraisal-book PDF inline, generated on **explicit** user action via the
 * SYNCHRONOUS report endpoint (no artifact file, no SignalR notification). Generation state lives
 * in a module-level store (useReportPreviewStore), NOT component state — so the render keeps running
 * in the background and the tab shows the true state (spinner / PDF) whenever the user returns.
 */
export const ReportPreviewTab = () => {
  const { t } = useTranslation('appraisal');
  const { appraisal } = useAppraisalContext();
  const appraisalId = appraisal?.appraisalId;

  const entry = useReportPreviewStore(s => (appraisalId ? s.previews.get(appraisalId) : undefined));
  const generate = useReportPreviewStore(s => s.generate);

  const status = entry?.status ?? 'idle';
  const objectUrl = entry?.objectUrl ?? null;

  const handleGenerate = () => {
    if (appraisalId) generate(appraisalId);
  };

  const handleOpenInNewTab = () => {
    if (objectUrl) window.open(objectUrl, '_blank', 'noopener');
  };

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
      <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Icon name="file-pdf" className="text-red-500" />
          <h3 className="text-base font-semibold text-gray-900 truncate">
            {t('reportPreview.title')}
          </h3>
        </div>
        {status === 'ready' && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleGenerate}>
              <Icon name="rotate-right" style="solid" className="size-3.5 mr-1.5" />
              {t('reportPreview.refresh')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenInNewTab}
              disabled={!objectUrl}
            >
              <Icon name="up-right-from-square" style="solid" className="size-3.5 mr-1.5" />
              {t('reportPreview.openInNewTab')}
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-[70vh] relative bg-gray-100">
        {status !== 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center">
            {status === 'generating' ? (
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <Icon name="spinner" style="solid" className="size-8 animate-spin text-primary" />
                <p className="text-sm">{t('reportPreview.generating')}</p>
              </div>
            ) : status === 'error' ? (
              <div className="flex flex-col items-center gap-3 text-center max-w-sm px-4">
                <div className="size-12 rounded-full bg-red-50 flex items-center justify-center">
                  <Icon
                    name="triangle-exclamation"
                    style="solid"
                    className="size-5 text-red-500"
                  />
                </div>
                <p className="text-sm text-gray-600">{t('reportPreview.renderFailed')}</p>
                <Button variant="outline" size="sm" onClick={handleGenerate}>
                  {t('common.retryButton')}
                </Button>
              </div>
            ) : (
              // idle — explicit generate CTA (no auto-generate)
              <div className="flex flex-col items-center gap-4 text-center max-w-sm px-4">
                <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon name="file-pdf" style="solid" className="size-5 text-primary" />
                </div>
                <p className="text-sm text-gray-500">{t('reportPreview.idleHint')}</p>
                <Button variant="primary" size="sm" onClick={handleGenerate}>
                  <Icon name="file-pdf" style="solid" className="size-3.5 mr-1.5" />
                  {t('reportPreview.generatePreview')}
                </Button>
              </div>
            )}
          </div>
        )}

        {objectUrl && (
          <iframe
            src={objectUrl}
            title={t('reportPreview.title')}
            className={`w-full h-full min-h-[70vh] border-0 ${status !== 'ready' ? 'invisible absolute inset-0' : ''}`}
          />
        )}
      </div>
    </section>
  );
};

export default ReportPreviewTab;
