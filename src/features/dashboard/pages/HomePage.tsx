import { useState } from 'react';
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useAuthStore } from '@features/auth/store';
import Icon from '@shared/components/Icon';
import { useDashboardStore } from '../store';
import { canPlaceInSidebar, type WidgetType } from '../types';
import {
  AddWidgetModal,
  CalendarWidget,
  DraggableWidget,
  ExternalTaskSummaryWidget,
  NotesWidget,
  ProgressSummaryWidget,
  RecentTaskWidget,
  ReminderWidget,
  TaskSummaryWidget,
  TeamWorkloadWidget,
  TotalAppraisalsWidget,
} from '../components';

// Droppable area component
function DroppableArea({
  id,
  children,
  className,
  isEditMode,
  isEmpty,
  label,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
  isEditMode: boolean;
  isEmpty: boolean;
  label: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${isOver && isEditMode ? 'ring-2 ring-blue-400 ring-offset-2 rounded-2xl' : ''}`}
    >
      {children}
      {isEmpty && isEditMode && (
        <div
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}
        >
          <p className={`text-sm ${isOver ? 'text-blue-500' : 'text-gray-400'}`}>
            {isOver ? 'Drop here' : label}
          </p>
        </div>
      )}
    </div>
  );
}

function HomePage() {
  const user = useAuthStore(state => state.user);
  const { widgets, isEditMode, setEditMode, reorderWidgets, moveWidget } = useDashboardStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Separate widgets by their current position
  const mainWidgets = widgets
    .filter(w => w.visible && w.position === 'main')
    .sort((a, b) => a.order - b.order);

  const sidebarWidgets = widgets
    .filter(w => w.visible && w.position === 'sidebar')
    .sort((a, b) => a.order - b.order);

  const activeWidget = activeId ? widgets.find(w => w.id === activeId) : null;

  const renderWidget = (widgetType: WidgetType) => {
    switch (widgetType) {
      case 'task-summary':
        return <TaskSummaryWidget />;
      case 'recent-task':
        return <RecentTaskWidget />;
      case 'calendar':
        return <CalendarWidget />;
      case 'reminders':
        return <ReminderWidget />;
      case 'notes':
        return <NotesWidget />;
      case 'total-appraisals':
        return <TotalAppraisalsWidget />;
      case 'progress-summary':
        return <ProgressSummaryWidget />;
      case 'team-workload':
        return <TeamWorkloadWidget />;
      case 'external-task-summary':
        return <ExternalTaskSummaryWidget />;
      default:
        return null;
    }
  };

  // Get current date formatted
  const today = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  };
  const formattedDate = today.toLocaleDateString('en-US', options);

  const handleDragStart = (event: { active: { id: string | number } }) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeWidgetData = widgets.find(w => w.id === active.id);
    if (!activeWidgetData) return;

    const overId = over.id as string;

    // Check if dropped on a droppable area (main-area or sidebar-area)
    if (overId === 'main-area' || overId === 'sidebar-area') {
      const targetPosition = overId === 'main-area' ? 'main' : 'sidebar';

      // Validate: can't drop large widgets in sidebar
      if (targetPosition === 'sidebar' && !canPlaceInSidebar(activeWidgetData.type)) {
        return; // Don't allow
      }

      // Move to new position if different
      if (activeWidgetData.position !== targetPosition) {
        moveWidget(active.id as string, targetPosition);
      }
      return;
    }

    // Check if dropped on another widget
    const overWidgetData = widgets.find(w => w.id === overId);
    if (!overWidgetData) return;

    // If dropping on a widget in a different position
    if (activeWidgetData.position !== overWidgetData.position) {
      const targetPosition = overWidgetData.position;

      // Validate: can't drop large widgets in sidebar
      if (targetPosition === 'sidebar' && !canPlaceInSidebar(activeWidgetData.type)) {
        return; // Don't allow
      }

      // Move to new position
      moveWidget(active.id as string, targetPosition);
    } else if (active.id !== over.id) {
      // Same position, just reorder
      reorderWidgets(active.id as string, over.id as string);
    }
  };

  const hasMainWidgets = mainWidgets.length > 0;
  const hasSidebarWidgets = sidebarWidgets.length > 0;
  const hasAnyWidgets = hasMainWidgets || hasSidebarWidgets;

  return (
    <div className={isEditMode ? 'pb-16' : ''}>
      {/* Welcome header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="bg-amber-50 p-3 rounded-2xl">
            <Icon name="hand-wave" style="solid" className="size-7 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">
              Welcome back{user?.name ? `, ${user.name}` : ''}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{formattedDate}</p>
          </div>
        </div>

        {/* Edit mode controls */}
        <div className="flex items-center gap-3">
          {isEditMode && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors"
            >
              <Icon name="plus" style="solid" className="size-5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditMode(!isEditMode)}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
              isEditMode
                ? 'bg-blue-500 text-white shadow-sm hover:bg-blue-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isEditMode ? 'Done' : 'Edit'}
          </button>
        </div>
      </div>

      {/* Main layout with sidebar */}
      {hasAnyWidgets || isEditMode ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6">
            {/* Main content area */}
            <DroppableArea
              id="main-area"
              className="flex-1 min-w-0"
              isEditMode={isEditMode}
              isEmpty={!hasMainWidgets}
              label="Drag widgets here for main panel"
            >
              {hasMainWidgets && (
                <SortableContext items={mainWidgets.map(w => w.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-12 gap-6 items-stretch">
                    {mainWidgets.map(widget => (
                      <DraggableWidget key={widget.id} widget={widget}>
                        {renderWidget(widget.type)}
                      </DraggableWidget>
                    ))}
                  </div>
                </SortableContext>
              )}
            </DroppableArea>

            {/* Right sidebar for small widgets */}
            <DroppableArea
              id="sidebar-area"
              className="w-80 shrink-0"
              isEditMode={isEditMode}
              isEmpty={!hasSidebarWidgets}
              label="Small widgets only"
            >
              {hasSidebarWidgets && (
                <SortableContext
                  items={sidebarWidgets.map(w => w.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-6">
                    {sidebarWidgets.map(widget => (
                      <DraggableWidget key={widget.id} widget={widget} isSidebar>
                        {renderWidget(widget.type)}
                      </DraggableWidget>
                    ))}
                  </div>
                </SortableContext>
              )}
            </DroppableArea>
          </div>

          {/* Drag overlay */}
          <DragOverlay>
            {activeWidget ? (
              <div className="opacity-80 rotate-2 scale-105">
                <div className="bg-white rounded-2xl shadow-2xl p-4 border-2 border-blue-400">
                  <p className="text-sm font-medium text-gray-600 text-center">
                    {activeWidget.type
                      .split('-')
                      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(' ')}
                  </p>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        /* Empty state */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Icon name="grid-2" style="regular" className="size-7 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">No widgets on your dashboard</p>
          <p className="text-gray-400 text-sm mt-1">Click Edit to add widgets</p>
        </div>
      )}

      {/* Edit mode hint */}
      {isEditMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 z-40">
          <Icon name="arrows-up-down-left-right" style="solid" className="size-4 text-gray-400" />
          <span className="text-sm">
            Drag widgets between panels • Small widgets can go in sidebar
          </span>
        </div>
      )}

      {/* Add Widget Modal */}
      <AddWidgetModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
    </div>
  );
}

export default HomePage;
