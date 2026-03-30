import { type DragEvent, useMemo } from 'react';
import { useGetActivityTypes } from '../../api';
import type { ActivityTypeDefinition } from '../../types';

// Map backend color hex to DaisyUI border-l classes
const COLOR_MAP: Record<string, string> = {
  '#22c55e': 'border-l-success',
  '#ef4444': 'border-l-error',
  '#3b82f6': 'border-l-primary',
  '#f59e0b': 'border-l-warning',
  '#8b5cf6': 'border-l-secondary',
  '#06b6d4': 'border-l-info',
  '#10b981': 'border-l-success',
  '#a855f7': 'border-l-accent',
};

function getColorClass(hex: string): string {
  return COLOR_MAP[hex] || 'border-l-neutral';
}

function onDragStart(event: DragEvent, type: string) {
  event.dataTransfer.setData('application/workflow-activity-type', type);
  event.dataTransfer.effectAllowed = 'move';
}

export function ActivityPalette() {
  const { data: activityTypes, isLoading } = useGetActivityTypes();

  // Group activity types by category
  const grouped = useMemo(() => {
    if (!activityTypes) return {};
    return activityTypes.reduce(
      (acc, at) => {
        const cat = at.category || 'Other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(at);
        return acc;
      },
      {} as Record<string, ActivityTypeDefinition[]>,
    );
  }, [activityTypes]);

  return (
    <div className="flex h-full w-[200px] flex-col border-r border-base-300 bg-base-200/50">
      <div className="border-b border-base-300 px-4 py-3">
        <h3 className="text-sm font-semibold text-base-content">Activities</h3>
        <p className="text-xs text-base-content/60">Drag to canvas</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center p-4">
            <span className="loading loading-spinner loading-sm" />
          </div>
        ) : (
          Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="p-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-base-content/40">
                {category}
              </div>
              <div className="flex flex-col gap-2">
                {items.map((item) => (
                  <div
                    key={item.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, item.type)}
                    className={`cursor-grab rounded-lg border-l-4 bg-base-100 p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing ${getColorClass(item.color)}`}
                  >
                    <div className="text-sm font-medium text-base-content">
                      {item.name}
                    </div>
                    <div className="text-xs text-base-content/60">
                      {item.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
