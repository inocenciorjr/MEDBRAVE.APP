// Removed Firebase Timestamp import - using native Date instead

export type AlertSeverity = 'info' | 'warning' | 'danger';

export interface UserAlert {
  id: string;
  user_id: string;
  specialty_id?: string;
  type: AlertSeverity;
  code: 'LOW_ACCURACY' | 'LOW_RECALL' | 'EXCESS_LAPSES' | 'GOAL_GAP';
  message: string;
  week_start?: string; // ISO date
  created_at: Date;
  read_at?: Date;
}
