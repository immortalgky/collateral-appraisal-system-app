import { useTranslation } from 'react-i18next';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDashboardStore } from '../store';
import {
  WIDGET_CONFIGS,
  getColSpanClass,
  type Widget,
  type WidgetType,
  type ColumnSpan,
} from '../types';
import Icon from '@shared/components/Icon';

type DraggableWidgetProps = {
  widget: Widget;
  children: React.ReactNode;
  isSidebar?: boolean;
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

function DraggableWidget({ widget, children, isSidebar = false }: DraggableWidgetProps) {
  const { t } = useTranslation('dashboard');
  const { isEditMode, removeWidget, resizeWidget } = useDashboardStore();
  const config = WIDGET_CONFIGS[widget.type];

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : undefined,
  };

  // Available size options based on min/max constraints (only for main widgets)
  const sizeOptions: ColumnSpan[] = [3, 4, 6, 8, 12].filter(
    size => size >= config.minCols && size <= config.maxCols,
  ) as ColumnSpan[];

  const handleSizeChange = (newSize: ColumnSpan) => {
    resizeWidget(widget.id, newSize);
  };

  const getSizeLabel = (size: ColumnSpan): string => {
    switch (size) {
      case 3:
        return t('draggable.size.quarter');
      case 4:
        return t('draggable.size.third');
      case 6:
        return t('draggable.size.half');
      case 8:
        return t('draggable.size.twoThirds');
      case 12:
        return t('draggable.size.full');
    }
  };

  // Sidebar widgets are full width in sidebar, main widgets use grid columns
  // Main widgets use h-full to stretch to equal height within the row
  const containerClass = isSidebar
    ? ''
    : `${getColSpanClass(widget.cols)} h-full ${isDragging ? 'ring-2 ring-blue-400 ring-offset-2' : ''}`;

  const configKey = WIDGET_TYPE_TO_CONFIG_KEY[widget.type];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${containerClass} ${isDragging && isSidebar ? 'ring-2 ring-blue-400 ring-offset-2 rounded-2xl' : ''}`}
    >
      <div className={`relative ${isSidebar ? '' : 'h-full'}`}>
        {/* Edit mode overlay controls */}
        {isEditMode && (
          <>
            {/* Drag handle */}
            <div
              {...attributes}
              {...listeners}
              className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 cursor-grab active:cursor-grabbing bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-1.5"
            >
              <Icon name="grip-dots-vertical" style="solid" className="size-3.5 text-gray-400" />
              <span className="text-xs font-medium text-gray-500">
                {t(`widgetConfigs.${configKey}.title`)}
              </span>
            </div>

            {/* Remove button */}
            <button
              type="button"
              onClick={() => removeWidget(widget.id)}
              className="absolute -top-2 -right-2 z-10 w-7 h-7 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-colors flex items-center justify-center"
            >
              <Icon name="xmark" style="solid" className="size-3.5" />
            </button>

            {/* Size selector - only show for main widgets with multiple size options */}
            {!isSidebar && sizeOptions.length > 1 && (
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10 bg-white border border-gray-200 rounded-lg px-2 py-1 shadow-sm flex items-center gap-1">
                {sizeOptions.map(size => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => handleSizeChange(size)}
                    className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                      widget.cols === size
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {getSizeLabel(size)}
                  </button>
                ))}
              </div>
            )}

            {/* Visual indicator overlay */}
            <div className="absolute inset-0 border-2 border-dashed border-blue-300 rounded-2xl pointer-events-none" />
          </>
        )}

        {children}
      </div>
    </div>
  );
}

export default DraggableWidget;
