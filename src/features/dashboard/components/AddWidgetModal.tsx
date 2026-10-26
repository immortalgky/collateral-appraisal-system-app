import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import { useDashboardStore } from '../store';
import {
  AVAILABLE_WIDGETS,
  canPlaceInSidebar,
  type WidgetType,
  type WidgetPosition,
} from '../types';

type AddWidgetModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type WidgetConfigKey =
  | 'totalAppraisals'
  | 'taskSummary'
  | 'progressSummary'
  | 'teamWorkload'
  | 'recentTask'
  | 'externalTaskSummary'
  | 'quotationTaskSummary'
  | 'calendar'
  | 'reminders'
  | 'notes';

const WIDGET_TYPE_TO_CONFIG_KEY: Record<WidgetType, WidgetConfigKey> = {
  'total-appraisals': 'totalAppraisals',
  'task-summary': 'taskSummary',
  'progress-summary': 'progressSummary',
  'team-workload': 'teamWorkload',
  'recent-task': 'recentTask',
  'external-task-summary': 'externalTaskSummary',
  'quotation-task-summary': 'quotationTaskSummary',
  calendar: 'calendar',
  reminders: 'reminders',
  notes: 'notes',
};

function AddWidgetModal({ isOpen, onClose }: AddWidgetModalProps) {
  const { t } = useTranslation(['dashboard', 'common']);
  const { widgets, addWidget } = useDashboardStore();

  const hiddenWidgets = AVAILABLE_WIDGETS.filter(
    aw => !widgets.find(w => w.type === aw.type && w.visible),
  );

  // Group widgets: large (main only) and small (can go either place)
  const largeWidgets = hiddenWidgets.filter(w => !canPlaceInSidebar(w.type));
  const smallWidgets = hiddenWidgets.filter(w => canPlaceInSidebar(w.type));

  const handleAddWidget = (type: WidgetType, position?: WidgetPosition) => {
    addWidget(type, position);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box bg-(--palette-surface) rounded-2xl shadow-xl max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-xl text-(--palette-ink)">{t('addWidget.title')}</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-(--palette-gray-400) hover:bg-(--palette-surface-3) hover:text-(--palette-gray-600) transition-colors"
          >
            <Icon name="xmark" style="solid" className="size-5" />
          </button>
        </div>

        {hiddenWidgets.length > 0 ? (
          <div className="space-y-6">
            {/* Large widgets - main panel only */}
            {largeWidgets.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-(--palette-gray-400) uppercase tracking-wider mb-3">
                  {t('addWidget.mainPanelOnly')}
                </h4>
                <div className="grid gap-3">
                  {largeWidgets.map(widget => {
                    const configKey = WIDGET_TYPE_TO_CONFIG_KEY[widget.type];
                    return (
                      <button
                        key={widget.type}
                        type="button"
                        onClick={() => handleAddWidget(widget.type, 'main')}
                        className="flex items-center gap-4 p-4 border border-(--palette-line-soft) rounded-xl hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:border-blue-200 dark:hover:border-blue-500/30 transition-all text-left group"
                      >
                        <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 transition-colors">
                          <Icon name="grid-2" style="solid" className="size-5 text-blue-500" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-(--palette-ink)">
                            {t(`widgetConfigs.${configKey}.title`)}
                          </p>
                          <p className="text-sm text-(--palette-gray-500)">
                            {t(`widgetConfigs.${configKey}.description`)}
                          </p>
                        </div>
                        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-500 text-white shadow-sm">
                          <Icon name="plus" style="solid" className="size-4" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Small widgets - can go in main or sidebar */}
            {smallWidgets.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-(--palette-gray-400) uppercase tracking-wider mb-3">
                  {t('addWidget.smallWidgets')}
                </h4>
                <div className="grid gap-3">
                  {smallWidgets.map(widget => {
                    const configKey = WIDGET_TYPE_TO_CONFIG_KEY[widget.type];
                    return (
                      <div
                        key={widget.type}
                        className="border border-(--palette-line-soft) rounded-xl p-4"
                      >
                        <div className="flex items-center gap-4 mb-3">
                          <div className="p-2.5 rounded-xl bg-(--palette-warn-wash)">
                            <Icon name="grid-2" style="solid" className="size-5 text-amber-500" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-(--palette-ink)">
                              {t(`widgetConfigs.${configKey}.title`)}
                            </p>
                            <p className="text-sm text-(--palette-gray-500)">
                              {t(`widgetConfigs.${configKey}.description`)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleAddWidget(widget.type, 'main')}
                            className="flex-1 py-2 px-3 text-sm font-medium rounded-lg bg-(--palette-surface-3) text-(--palette-ink) hover:bg-blue-100 dark:hover:bg-blue-500/20 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center justify-center gap-2"
                          >
                            <Icon name="table-columns" style="solid" className="size-4" />
                            {t('addWidget.addToMain')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddWidget(widget.type, 'sidebar')}
                            className="flex-1 py-2 px-3 text-sm font-medium rounded-lg bg-(--palette-surface-3) text-(--palette-ink) hover:bg-amber-100 dark:hover:bg-amber-500/20 hover:text-(--palette-warn) transition-colors flex items-center justify-center gap-2"
                          >
                            <Icon name="sidebar" style="solid" className="size-4" />
                            {t('addWidget.addToSidebar')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-10">
            <div className="mx-auto w-16 h-16 bg-green-50 dark:bg-green-500/10 rounded-full flex items-center justify-center mb-4">
              <Icon name="circle-check" style="solid" className="size-8 text-green-500" />
            </div>
            <p className="text-(--palette-gray-600) font-medium">{t('addWidget.allVisible')}</p>
            <p className="text-sm text-(--palette-gray-400) mt-1">
              {t('addWidget.allVisibleHint')}
            </p>
          </div>
        )}

        <div className="modal-action mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-(--palette-surface-3) hover:bg-(--palette-line) text-(--palette-ink) font-medium rounded-xl transition-colors"
          >
            {t('common:actions.close')}
          </button>
        </div>
      </div>
      <div className="modal-backdrop bg-black/40" onClick={onClose}>
        <button type="button">{t('common:actions.close')}</button>
      </div>
    </dialog>
  );
}

export default AddWidgetModal;
