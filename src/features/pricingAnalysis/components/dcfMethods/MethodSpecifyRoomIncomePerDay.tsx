import Modal from '@/shared/components/Modal';
import { useFieldArray, useFormContext } from 'react-hook-form';
import type { DCFMethodFormType } from '../../schemas/dcfForm';
import clsx from 'clsx';
import { DiscountedCashFlowMethodModal } from '../DiscountedCashFlowMethodModal';

interface MethodSpecifyRoomIncomePerDayProps {
  editing: string | null;
  expanded: boolean;
  assumptionId: string;
  assumptionName: string;
  method: DCFMethodFormType;
  totalNumberOfYears: number;
  onCancelEditMode: () => void;
}
export function MethodSpecifyRoomIncomePerDay({
  editing,
  expanded,
  assumptionId,
  assumptionName,
  method,
  totalNumberOfYears,
  onCancelEditMode,
}: MethodSpecifyRoomIncomePerDayProps) {
  const { control } = useFormContext();
  const { fields } = useFieldArray({ control, name: 'methods.' });

  return (
    <>
      {expanded && <MethodSpecifyRoomIncomePerDayTable totalNumberOfYear={totalNumberOfYears} />}
      {editing == method.methodType && (
        <DiscountedCashFlowMethodModal
          editing={editing}
          onCancelEditMode={onCancelEditMode}
          assumptionName={assumptionName}
        >
          <MethodSpecifyRoomIncomePerDayModal />
        </DiscountedCashFlowMethodModal>
      )}
    </>
  );
}

interface MethodSpecifyRoomIncomePerDayTableProps {
  totalNumberOfYear: number;
}
function MethodSpecifyRoomIncomePerDayTable({
  totalNumberOfYear,
}: MethodSpecifyRoomIncomePerDayTableProps) {
  const rowHeaderStyle = 'pl-20 px-1 py-1.5 text-sm';
  return (
    <>
      <tr>
        <td className={clsx(rowHeaderStyle)}>Saleable Area (65 Rooms)</td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className="text-right text-sm px-1.5 py-1.5">
              {idx}
            </td>
          );
        })}
      </tr>
      <tr>
        <td className={clsx(rowHeaderStyle)}>Occupancy Rate</td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className="text-right text-sm px-1.5 py-1.5">
              {idx}
            </td>
          );
        })}
      </tr>
      <tr>
        <td className={clsx(rowHeaderStyle)}>Total Number of Saleable Area</td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className="text-right text-sm px-1.5 py-1.5">
              {idx}
            </td>
          );
        })}
      </tr>
      <tr>
        <td className={clsx(rowHeaderStyle)}>Increase Rate</td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className="text-right text-sm px-1.5 py-1.5">
              {idx}
            </td>
          );
        })}
      </tr>
      <tr>
        <td className={clsx(rowHeaderStyle)}>Average Daily Rate (ADR)</td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className="text-right text-sm px-1.5 py-1.5">
              {idx}
            </td>
          );
        })}
      </tr>
      <tr>
        <td className={clsx(rowHeaderStyle)}>Total Room Income</td>
        {Array.from({ length: totalNumberOfYear }).map((_, idx) => {
          return (
            <td key={idx} className="text-right text-sm px-1.5 py-1.5">
              {idx}
            </td>
          );
        })}
      </tr>
    </>
  );
}

function MethodSpecifyRoomIncomePerDayModal() {
  return <>Comming soon!</>;
}
