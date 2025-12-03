import Icon from '@shared/components/Icon';
import { useDashboardStore } from '../store';
import { AVAILABLE_WIDGETS, canPlaceInSidebar, type WidgetType, type WidgetPosition } from '../types';

type AddWidgetModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

function AddWidgetModal({ isOpen, onClose }: AddWidgetModalProps) {
  const { widgets, addWidget } = useDashboardStore();

  const hiddenWidgets = AVAILABLE_WIDGETS.filter(
    (aw) => !widgets.find((w) => w.type === aw.type && w.visible)
  );

  // Group widgets: large (main only) and small (can go either place)
  const largeWidgets = hiddenWidgets.filter((w) => !canPlaceInSidebar(w.type));
  const smallWidgets = hiddenWidgets.filter((w) => canPlaceInSidebar(w.type));

  const handleAddWidget = (type: WidgetType, position?: WidgetPosition) => {
    addWidget(type, position);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box bg-white rounded-2xl shadow-xl max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-xl text-gray-800">Add Widget</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <Icon name="xmark" style="solid" className="size-5" />
          </button>
        </div>

        {hiddenWidgets.length > 0 ? (
          <div className="space-y-6">
            {/* Large widgets - main panel only */}
            {largeWidgets.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Main Panel Only
                </h4>
                <div className="grid gap-3">
                  {largeWidgets.map((widget) => (
                    <button
                      key={widget.type}
                      type="button"
                      onClick={() => handleAddWidget(widget.type, 'main')}
                      className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all text-left group"
                    >
                      <div className="p-2.5 rounded-xl bg-blue-50 group-hover:bg-blue-100 transition-colors">
                        <Icon name="grid-2" style="solid" className="size-5 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{widget.title}</p>
                        <p className="text-sm text-gray-500">{widget.description}</p>
                      </div>
                      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-500 text-white shadow-sm">
                        <Icon name="plus" style="solid" className="size-4" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Small widgets - can go in main or sidebar */}
            {smallWidgets.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Small Widgets
                </h4>
                <div className="grid gap-3">
                  {smallWidgets.map((widget) => (
                    <div
                      key={widget.type}
                      className="border border-gray-100 rounded-xl p-4"
                    >
                      <div className="flex items-center gap-4 mb-3">
                        <div className="p-2.5 rounded-xl bg-amber-50">
                          <Icon name="grid-2" style="solid" className="size-5 text-amber-500" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{widget.title}</p>
                          <p className="text-sm text-gray-500">{widget.description}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleAddWidget(widget.type, 'main')}
                          className="flex-1 py-2 px-3 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <Icon name="table-columns" style="solid" className="size-4" />
                          Main Panel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddWidget(widget.type, 'sidebar')}
                          className="flex-1 py-2 px-3 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-amber-100 hover:text-amber-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <Icon name="sidebar" style="solid" className="size-4" />
                          Sidebar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-10">
            <div className="mx-auto w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
              <Icon name="circle-check" style="solid" className="size-8 text-green-500" />
            </div>
            <p className="text-gray-600 font-medium">All widgets visible</p>
            <p className="text-sm text-gray-400 mt-1">Your dashboard is fully configured</p>
          </div>
        )}

        <div className="modal-action mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
      <div className="modal-backdrop bg-black/40" onClick={onClose}>
        <button type="button">close</button>
      </div>
    </dialog>
  );
}

export default AddWidgetModal;
