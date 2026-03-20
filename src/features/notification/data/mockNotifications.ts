import type { Notification } from '../types';

const now = Date.now();
const min = (n: number) => new Date(now - n * 60_000).toISOString();
const hr = (n: number) => new Date(now - n * 3_600_000).toISOString();
const day = (n: number) => new Date(now - n * 86_400_000).toISOString();

export const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'task_assigned',
    title: 'New task assigned',
    description: 'You have been assigned to appraisal request #REQ-2025-0042 for property valuation.',
    createdAt: min(3),
    isRead: false,
  },
  {
    id: '2',
    type: 'deadline_warning',
    title: 'Deadline approaching',
    description: 'Appraisal #APR-2025-0038 is due in 2 days. Please complete the pricing analysis.',
    createdAt: min(25),
    isRead: false,
  },
  {
    id: '3',
    type: 'task_approved',
    title: 'Appraisal approved',
    description: 'Your appraisal for Condo Unit 1502, Sukhumvit Tower has been approved by the manager.',
    createdAt: hr(1),
    isRead: false,
  },
  {
    id: '4',
    type: 'pricing_completed',
    title: 'Pricing analysis completed',
    description: 'Direct comparison method completed for property group "Land & Building - Rama 9".',
    createdAt: hr(3),
    isRead: true,
  },
  {
    id: '5',
    type: 'appointment',
    title: 'Site visit scheduled',
    description: 'Appointment confirmed for March 21, 2026 at 10:00 AM — Land parcel in Bangna.',
    createdAt: hr(5),
    isRead: false,
  },
  {
    id: '6',
    type: 'system_maintenance',
    title: 'Scheduled maintenance',
    description: 'System will undergo maintenance on March 22, 2026 from 02:00–04:00 AM.',
    createdAt: day(1),
    isRead: true,
  },
  {
    id: '7',
    type: 'task_assigned',
    title: 'Review requested',
    description: 'Somchai K. requested your review on appraisal #APR-2025-0041 — Building in Sathorn.',
    createdAt: day(1),
    isRead: true,
  },
  {
    id: '8',
    type: 'deadline_warning',
    title: 'Overdue document',
    description: 'Document checklist for #APR-2025-0035 is overdue. Please upload remaining items.',
    createdAt: day(2),
    isRead: false,
  },
  {
    id: '9',
    type: 'task_approved',
    title: 'Market comparable verified',
    description: 'Market comparable data for Condo project "The Base Rama 9" has been verified.',
    createdAt: day(3),
    isRead: true,
  },
  {
    id: '10',
    type: 'appointment',
    title: 'Appointment rescheduled',
    description: 'Site visit for #APR-2025-0039 moved to March 25, 2026 at 2:00 PM per client request.',
    createdAt: day(4),
    isRead: true,
  },
];
