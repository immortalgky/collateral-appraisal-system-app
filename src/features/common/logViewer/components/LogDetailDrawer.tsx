import { useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import SlideOverPanel from '@shared/components/SlideOverPanel';
import Icon from '@shared/components/Icon';
import type { LogItem } from '../types';
import { logLevelBadgeClass } from '../types';

interface LogDetailDrawerProps {
  log: LogItem | null;
  onClose: () => void;
}

const LabelValue = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
    <span className="text-sm text-gray-900 break-all">
      {value ?? <span className="text-gray-300">—</span>}
    </span>
  </div>
);

const LogDetailDrawer = ({ log, onClose }: LogDetailDrawerProps) => {
  const { t } = useTranslation('logAdmin');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!log?.exception) return;
    void navigator.clipboard.writeText(log.exception).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <SlideOverPanel
      isOpen={!!log}
      onClose={onClose}
      title={t('drawer.title')}
      subtitle={log?.level ?? undefined}
      width="xl"
    >
      {log ? (
        <div className="flex flex-col gap-5">
          {/* Level badge */}
          {log.level && (
            <span
              className={`inline-flex self-start items-center px-2 py-0.5 rounded-full text-xs font-medium ${logLevelBadgeClass[log.level]}`}
            >
              {log.level}
            </span>
          )}

          {/* Timestamp */}
          <LabelValue
            label={t('columns.timeStamp')}
            value={new Date(log.timeStamp).toLocaleString()}
          />

          {/* Message */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              {t('columns.message')}
            </p>
            <p className="text-sm text-gray-900 whitespace-pre-wrap break-words bg-gray-50 rounded-lg px-3 py-2">
              {log.message ?? <span className="text-gray-300">—</span>}
            </p>
          </div>

          {/* IDs grid */}
          <div className="grid grid-cols-2 gap-4">
            <LabelValue label={t('columns.correlationId')} value={log.correlationId} />
            <LabelValue label={t('columns.appraisalId')} value={log.appraisalId} />
            <LabelValue label={t('columns.requestId')} value={log.requestId} />
            <LabelValue label={t('columns.entityId')} value={log.entityId} />
            <LabelValue label={t('columns.workflowInstanceId')} value={log.workflowInstanceId} />
            <LabelValue label={t('columns.collateralId')} value={log.collateralId} />
            <LabelValue label={t('columns.documentId')} value={log.documentId} />
            <LabelValue label={t('columns.machineName')} value={log.machineName} />
          </div>

          {/* Exception */}
          {log.exception && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {t('columns.exception')}
                </p>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary transition-colors"
                >
                  <Icon name={copied ? 'circle-check' : 'copy'} style="regular" className="size-3.5" />
                  {copied ? t('drawer.copied') : t('drawer.copy')}
                </button>
              </div>
              <pre className="text-xs bg-gray-950 text-red-300 rounded-xl p-4 overflow-x-auto overflow-y-auto max-h-80 leading-relaxed whitespace-pre-wrap">
                {log.exception}
              </pre>
            </div>
          )}
        </div>
      ) : null}
    </SlideOverPanel>
  );
};

export default LogDetailDrawer;
