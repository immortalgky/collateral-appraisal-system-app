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
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import { carryForwardLockKind, type DocumentTypeDto } from '../types';

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

const pill = 'inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium';

const CarryForwardPill = ({ dt }: { dt: DocumentTypeDto }) => {
  const { t } = useTranslation('request');
  const locked = carryForwardLockKind(dt);
  if (locked === 'target')
    return (
      <span className={`${pill} bg-violet-50 text-violet-700`}>
        {t('carryForward.admin.lockedTarget')}
      </span>
    );
  if (locked === 'source')
    return (
      <span className={`${pill} bg-gray-100 text-gray-600`}>
        {t('carryForward.admin.lockedSource')}
      </span>
    );
  return dt.carryForwardByDefault ? (
    <span className={`${pill} bg-green-50 text-green-700`}>{t('carryForward.admin.use')}</span>
  ) : (
    <span className={`${pill} bg-amber-50 text-amber-700`}>{t('carryForward.admin.dontUse')}</span>
  );
};

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
      <td className="px-4 py-3">
        <CarryForwardPill dt={dt} />
      </td>
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
  const { t } = useTranslation('request');
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
      <table className="min-w-full divide-y divide-gray-200 text-table">
        <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
          <tr>
            <th className="text-xs px-2 py-3 w-10 font-semibold" />
            <th className="text-xs px-4 py-3 font-semibold">Code</th>
            <th className="text-xs px-4 py-3 font-semibold">Name</th>
            <th className="text-xs px-4 py-3 font-semibold">Category</th>
            <th className="text-xs px-4 py-3 font-semibold">{t('carryForward.admin.column')}</th>
            <th className="text-xs px-4 py-3 font-semibold">Active</th>
            <th className="text-xs px-4 py-3 text-right font-semibold">Actions</th>
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
