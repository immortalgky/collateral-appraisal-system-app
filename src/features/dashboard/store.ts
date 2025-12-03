import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_WIDGETS, WIDGET_CONFIGS, canPlaceInSidebar, type Widget, type WidgetType, type ColumnSpan, type WidgetPosition } from './types';

type DashboardStore = {
  widgets: Widget[];
  isEditMode: boolean;
  setEditMode: (mode: boolean) => void;
  addWidget: (type: WidgetType, position?: WidgetPosition) => void;
  removeWidget: (id: string) => void;
  reorderWidgets: (activeId: string, overId: string) => void;
  resizeWidget: (id: string, cols: ColumnSpan) => void;
  moveWidget: (id: string, position: WidgetPosition) => void;
  resetWidgets: () => void;
};

// Merge persisted widgets with DEFAULT_WIDGETS to include any new widgets
const mergeWidgets = (persistedWidgets: Widget[]): Widget[] => {
  const existingIds = new Set(persistedWidgets.map((w) => w.id));
  const newWidgets = DEFAULT_WIDGETS.filter((w) => !existingIds.has(w.id));
  // Ensure all widgets have position field
  const updatedWidgets = persistedWidgets.map((w) => ({
    ...w,
    position: w.position || (canPlaceInSidebar(w.type) ? 'sidebar' : 'main'),
  })) as Widget[];
  return [...updatedWidgets, ...newWidgets];
};

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set) => ({
      widgets: DEFAULT_WIDGETS,
      isEditMode: false,
      setEditMode: (mode) => set({ isEditMode: mode }),

      addWidget: (type, position) =>
        set((state) => {
          const existingWidget = state.widgets.find((w) => w.type === type);
          if (existingWidget) {
            // Determine position - use provided, or default based on minCols
            const targetPosition = position || (canPlaceInSidebar(type) ? 'sidebar' : 'main');

            // Validate: can't place large widgets in sidebar
            if (targetPosition === 'sidebar' && !canPlaceInSidebar(type)) {
              return state; // Don't allow
            }

            // Get the highest order number and add widget at the end
            const maxOrder = Math.max(...state.widgets.filter((w) => w.visible).map((w) => w.order), 0);
            const config = WIDGET_CONFIGS[type];
            return {
              widgets: state.widgets.map((w) =>
                w.type === type
                  ? { ...w, visible: true, order: maxOrder + 1, cols: config.defaultCols, position: targetPosition }
                  : w
              ),
            };
          }
          return state;
        }),

      removeWidget: (id) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, visible: false } : w
          ),
        })),

      reorderWidgets: (activeId, overId) =>
        set((state) => {
          const activeWidget = state.widgets.find((w) => w.id === activeId);
          const overWidget = state.widgets.find((w) => w.id === overId);

          if (!activeWidget || !overWidget) return state;

          // Only reorder within the same position (main or sidebar)
          if (activeWidget.position !== overWidget.position) return state;

          const positionWidgets = state.widgets
            .filter((w) => w.visible && w.position === activeWidget.position)
            .sort((a, b) => a.order - b.order);

          const activeIndex = positionWidgets.findIndex((w) => w.id === activeId);
          const overIndex = positionWidgets.findIndex((w) => w.id === overId);

          if (activeIndex === -1 || overIndex === -1) return state;

          // Reorder the widgets
          const reordered = [...positionWidgets];
          const [removed] = reordered.splice(activeIndex, 1);
          reordered.splice(overIndex, 0, removed);

          // Update order numbers
          const updatedOrders = new Map<string, number>();
          reordered.forEach((w, index) => {
            updatedOrders.set(w.id, index + 1);
          });

          return {
            widgets: state.widgets.map((w) => ({
              ...w,
              order: updatedOrders.get(w.id) ?? w.order,
            })),
          };
        }),

      resizeWidget: (id, cols) =>
        set((state) => {
          const widget = state.widgets.find((w) => w.id === id);
          if (!widget) return state;

          const config = WIDGET_CONFIGS[widget.type];
          // Clamp cols to min/max
          const clampedCols = Math.max(config.minCols, Math.min(config.maxCols, cols)) as ColumnSpan;

          return {
            widgets: state.widgets.map((w) =>
              w.id === id ? { ...w, cols: clampedCols } : w
            ),
          };
        }),

      moveWidget: (id, position) =>
        set((state) => {
          const widget = state.widgets.find((w) => w.id === id);
          if (!widget) return state;

          // Validate: can't move large widgets to sidebar
          if (position === 'sidebar' && !canPlaceInSidebar(widget.type)) {
            return state;
          }

          // Get max order in target position
          const maxOrder = Math.max(
            ...state.widgets.filter((w) => w.visible && w.position === position).map((w) => w.order),
            0
          );

          return {
            widgets: state.widgets.map((w) =>
              w.id === id ? { ...w, position, order: maxOrder + 1 } : w
            ),
          };
        }),

      resetWidgets: () => set({ widgets: DEFAULT_WIDGETS }),
    }),
    {
      name: 'dashboard-widgets',
      version: 6, // Bump version for position field
      migrate: (persistedState, version) => {
        const state = persistedState as DashboardStore;
        if (version < 6) {
          // Reset to new default widgets with position
          return {
            ...state,
            widgets: DEFAULT_WIDGETS,
          };
        }
        return state;
      },
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<DashboardStore>;
        return {
          ...currentState,
          ...persisted,
          widgets: mergeWidgets(persisted.widgets || []),
        };
      },
    }
  )
);
