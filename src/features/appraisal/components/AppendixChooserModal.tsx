import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';

interface AppendixChooserOption {
  id: string;
  appendixTypeName: string;
  documentCount: number;
}

interface AppendixChooserModalProps {
  isOpen: boolean;
  onClose: () => void;
  appendices: AppendixChooserOption[];
  onSelect: (appendixId: string) => void;
}

/**
 * "Choose appendix first" flow for the Appendix section's global Add Files button — replaces
 * the old hardcoded `appendices[0].id` shortcut. Picking an option here hands off into the
 * existing PhotoSourceModal/upload flow via `onSelect`.
 */
export const AppendixChooserModal = ({
  isOpen,
  onClose,
  appendices,
  onSelect,
}: AppendixChooserModalProps) => {
  const { t } = useTranslation('appraisal');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-md overflow-hidden max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('valuationDocuments.appendixChooser.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icon name="xmark" className="text-lg" />
          </button>
        </div>

        {/* Options */}
        <div className="p-2 overflow-y-auto">
          {appendices.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              {t('valuationDocuments.appendixChooser.empty')}
            </p>
          ) : (
            appendices.map(appendix => (
              <button
                key={appendix.id}
                type="button"
                onClick={() => onSelect(appendix.id)}
                className="w-full flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <span className="text-sm font-medium text-gray-900 truncate">
                  {appendix.appendixTypeName}
                </span>
                <span className="flex items-center gap-2 flex-shrink-0">
                  {appendix.documentCount > 0 && (
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
                      {appendix.documentCount}
                    </span>
                  )}
                  <Icon name="chevron-right" className="text-gray-400" />
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AppendixChooserModal;
