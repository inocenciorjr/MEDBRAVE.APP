import { Timestamp } from 'firebase-admin/firestore';

export type AlertSeverity = 'info' | 'warning' | 'danger';

export interface UserAlert {
  id: string;
  userId: string;
  specialtyId?: string;
  type: AlertSeverity;
  code: 'LOW_ACCURACY' | 'LOW_RECALL' | 'EXCESS_LAPSES' | 'GOAL_GAP';
  message: string;
  weekStart?: string; // ISO date
  createdAt: Timestamp;
  readAt?: Timestamp;
} 