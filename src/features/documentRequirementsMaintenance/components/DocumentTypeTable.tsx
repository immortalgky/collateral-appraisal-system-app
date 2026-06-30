import { useEffect, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Icon from '@shared/components/Icon';
import type { DocumentTypeDto } from '../types';

interface Props {
  documentTypes: DocumentTypeDto[];
  isLoading?: boolean;
  onEdit: (dt: DocumentTypeDto) => void;
  onDelete: (dt: DocumentTypeDto) => void;
  onReorder: (items: { id: string; sortOrder: number }[]) => void;
}

interface RowProps {
  dt: DocumentTypeDto;
  onEdit: (dt: DocumentTypeDto) => void;
  onDelete: (dt: DocumentTypeDto) => void;
}

const SortableRow = ({ dt, onEdit, onDelete }: RowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: dt.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className={dt.isActive ? '' : 'opacity-50'}>
      <td className="px-2 py-3 text-center cursor-grab text-gray-400" {...attributes} {...listeners}>
        <Icon name="grip-vertical" style="solid" className="size-4" />
      </td>
      <td className="px-4 py-3 font-medium text-gray-900">{dt.code}</td>
      <td className="px-4 py-3 text-gray-700">{dt.name}</td>
      <td className="px-4 py-3 text-gray-500">{dt.category}</td>
      <td className="px-4 py-3">{dt.isActive ? 'Yes' : 'No'}</td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          <button
            onClick={() => onEdit(dt)}
            className="text-gray-400 hover:text-gray-700"
            aria-label="Edit"
          >
            <Icon name="pen" style="regular" className="size-3.5" />
          </button>
          <button
            onClick={() => onDelete(dt)}
            className="text-gray-400 hover:text-danger"
            aria-label="Delete"
          >
            <Icon name="trash" style="regular" className="size-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default function DocumentTypeTable({
  documentTypes,
  isLoading,
  onEdit,
  onDelete,
  onReorder,
}: Props) {
  // Local order for optimistic drag feedback; resync when server data changes.
  const [order, setOrder] = useState<DocumentTypeDto[]>(documentTypes);
  useEffect(() => setOrder(documentTypes), [documentTypes]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = order.findIndex(d => d.id === active.id);
    const newIndex = order.findIndex(d => d.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(order, oldIndex, newIndex).map((d, i) => ({
      ...d,
      sortOrder: (i + 1) * 10,
    }));
    setOrder(reordered);
    onReorder(reordered.map(d => ({ id: d.id, sortOrder: d.sortOrder })));
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading…</div>;
  }

  if (order.length === 0) {
    return <div className="p-8 text-center text-gray-500">No document types.</div>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
          <tr>
            <th className="px-2 py-3 w-10" />
            <th className="px-4 py-3">Code</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Active</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          <SortableContext items={order.map(d => d.id)} strategy={verticalListSortingStrategy}>
            {order.map(dt => (
              <SortableRow key={dt.id} dt={dt} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </SortableContext>
        </tbody>
      </table>
    </DndContext>
  );
}
