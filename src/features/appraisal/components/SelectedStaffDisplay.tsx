import type { ComponentProps } from 'react';
import { useGetUserByUsername } from '../api/administration';
import StaffDisplay from './StaffDisplay';

/**
 * The selected-staff card with the person's own record. The staff may come from the eligible pool
 * (a name only), a saved draft, or a preselect; the position, department, phone and email are read
 * from the user record by username, whichever way they were chosen. The workload stays what the
 * caller passes (the pool's count).
 */
const SelectedStaffDisplay = (props: ComponentProps<typeof StaffDisplay>) => {
  const { staff } = props;
  const hasDetails = !!(staff.position || staff.phone || staff.email || staff.department);
  const { data: record } = useGetUserByUsername(staff.employeeId || null, !hasDetails);
  return (
    <StaffDisplay
      {...props}
      staff={
        record
          ? {
              ...staff,
              position: record.position,
              department: record.department,
              phone: record.phone,
              email: record.email,
              avatar: staff.avatar ?? record.avatar,
            }
          : staff
      }
    />
  );
};

export default SelectedStaffDisplay;
