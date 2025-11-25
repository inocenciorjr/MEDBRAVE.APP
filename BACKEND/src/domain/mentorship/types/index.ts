// Tipos para o domínio de mentoria

/**
 * Status da mentoria
 */
export enum MentorshipStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * Frequência das reuniões de mentoria
 */
export enum MeetingFrequency {
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  CUSTOM = 'custom',
}

/**
 * Status da reunião de mentoria
 */
export enum MeetingStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  RESCHEDULED = 'rescheduled',
}

/**
 * Tipo da reunião de mentoria
 */
export enum MeetingType {
  VIDEO = 'video',
  AUDIO = 'audio',
  CHAT = 'chat',
  IN_PERSON = 'in-person',
}

/**
 * Status do objetivo da mentoria
 */
export enum ObjectiveStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * Tipo de recurso da mentoria
 */
export enum ResourceType {
  LINK = 'link',
  FILE = 'file',
  VIDEO = 'video',
  ARTICLE = 'article',
  OTHER = 'other',
}

/**
 * Interface para o perfil de mentor
 */
export interface MentorProfile {
  id: string;
  userId: string;
  specialties: string[];
  biography: string;
  experience: string[];
  education: string[];
  availability: {
    days: number[];
    startTime: string;
    endTime: string;
  }[];
  rating: number;
  totalSessions: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface para mentoria
 */
export interface Mentorship {
  id: string;
  mentorId: string;
  menteeId: string;
  title: string;
  description?: string;
  status: MentorshipStatus;
  startDate: Date;
  endDate?: Date | null;
  meetingFrequency?: MeetingFrequency;
  nextMeetingDate?: Date | null;
  lastMeetingDate?: Date | null;
  meetingCount?: number;
  customFrequencyDays?: number;
  totalMeetings?: number;
  completedMeetings?: number;
  objectives?: string[];
  notes?: string;
  rating: number | null;
  feedback: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface para reunião de mentoria
 */
export interface MentorshipMeeting {
  id: string;
  mentorshipId: string;
  scheduledDate: Date;
  actualDate?: Date | null;
  duration: number;
  actualDuration?: number | null;
  status: MeetingStatus;
  meetingType: MeetingType;
  meetingLink?: string | null;
  meetingLocation?: string | null;
  agenda: string;
  notes?: string | null;
  mentorFeedback?: string | null;
  studentFeedback?: string | null;
  rescheduledFromId?: string | null;
  rescheduledToId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface para objetivo de mentoria
 */
export interface MentorshipObjective {
  id: string;
  mentorshipId: string;
  title: string;
  description?: string | null;
  status: ObjectiveStatus;
  targetDate?: Date | null;
  completedDate?: Date | null;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface para feedback de mentoria
 */
export interface MentorshipFeedback {
  id: string;
  mentorshipId: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  rating?: number | null;
  meetingId?: string | null;
  isAnonymous: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface para recurso da mentoria
 */
export interface MentorshipResource {
  id: string;
  mentorshipId: string;
  addedByUserId: string;
  title: string;
  type: ResourceType;
  url: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface para exame simulado de mentoria
 */
export interface MentorshipSimulatedExam {
  id: string;
  mentorshipId: string;
  simulatedExamId: string;
  assignedByUserId: string;
  assignedDate: Date;
  dueDate?: Date | null;
  completedDate?: Date | null;
  score?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Payload para criação de perfil de mentor
 */
export interface CreateMentorProfilePayload {
  userId: string;
  specialties: string[];
  biography: string;
  experience: string[];
  education: string[];
  availability: {
    days: number[];
    startTime: string;
    endTime: string;
  }[];
}

/**
 * Payload para atualização de perfil de mentor
 */
export type UpdateMentorProfilePayload = Partial<
  Omit<
    MentorProfile,
    'id' | 'userId' | 'createdAt' | 'updatedAt' | 'rating' | 'totalSessions'
  >
>;

/**
 * Payload para criação de mentoria
 */
export interface CreateMentorshipPayload {
  mentorId: string;
  menteeId: string;
  title: string;
  description?: string;
  meetingFrequency?: MeetingFrequency;
  customFrequencyDays?: number;
  totalMeetings?: number;
  objectives?: string[];
  notes?: string;
}

/**
 * Payload para atualização de mentoria
 */
export type UpdateMentorshipPayload = Partial<
  Omit<Mentorship, 'id' | 'createdAt' | 'updatedAt'>
>;

/**
 * Payload para criação de reunião de mentoria
 */
export interface CreateMentorshipMeetingPayload {
  mentorshipId: string;
  scheduledDate: Date;
  duration: number;
  meetingType: MeetingType;
  meetingLink?: string | null;
  meetingLocation?: string | null;
  agenda: string;
  rescheduledFromId?: string | null;
}

/**
 * Payload para atualização de reunião de mentoria
 */
export type UpdateMentorshipMeetingPayload = Partial<
  Omit<MentorshipMeeting, 'id' | 'mentorshipId' | 'createdAt' | 'updatedAt'>
>;

/**
 * Payload para criação de objetivo da mentoria
 */
export interface CreateMentorshipObjectivePayload {
  mentorshipId: string;
  title: string;
  description?: string | null;
  targetDate?: Date | null;
  status?: ObjectiveStatus;
  progress?: number;
}

/**
 * Payload para atualização de objetivo da mentoria
 */
export type UpdateMentorshipObjectivePayload = Partial<
  Omit<MentorshipObjective, 'id' | 'mentorshipId' | 'createdAt' | 'updatedAt'>
>;

/**
 * Payload para criação de feedback da mentoria
 */
export interface CreateMentorshipFeedbackPayload {
  mentorshipId: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  rating?: number | null;
  meetingId?: string | null;
  isAnonymous?: boolean;
}

/**
 * Payload para atualização de feedback da mentoria
 */
export type UpdateMentorshipFeedbackPayload = Partial<
  Omit<
    MentorshipFeedback,
    | 'id'
    | 'mentorshipId'
    | 'fromUserId'
    | 'toUserId'
    | 'createdAt'
    | 'updatedAt'
  >
>;

/**
 * Payload para criação de recurso da mentoria
 */
export interface CreateMentorshipResourcePayload {
  mentorshipId: string;
  addedByUserId: string;
  title: string;
  type: ResourceType;
  url: string;
  description?: string | null;
}

/**
 * Payload para atualização de recurso da mentoria
 */
export type UpdateMentorshipResourcePayload = Partial<
  Omit<
    MentorshipResource,
    'id' | 'mentorshipId' | 'addedByUserId' | 'createdAt' | 'updatedAt'
  >
>;

/**
 * Payload para criação de simulado da mentoria
 */
export interface CreateMentorshipSimulatedExamPayload {
  mentorshipId: string;
  simulatedExamId: string;
  assignedByUserId: string;
  dueDate?: Date | null;
}

/**
 * Payload para atualização de simulado da mentoria
 */
export type UpdateMentorshipSimulatedExamPayload = Partial<
  Omit<
    MentorshipSimulatedExam,
    | 'id'
    | 'mentorshipId'
    | 'simulatedExamId'
    | 'assignedByUserId'
    | 'assignedDate'
    | 'createdAt'
    | 'updatedAt'
  >
>;

/**
 * Opções para listar mentorias
 */
export interface ListMentorshipsOptions {
  mentorId?: string;
  menteeId?: string;
  status?: MentorshipStatus | MentorshipStatus[];
  limit?: number;
  page?: number;
  startAfter?: string;
}

/**
 * Resultado paginado de mentorias
 */
export interface PaginatedMentorshipsResult {
  items: Mentorship[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  nextPageStartAfter?: string;
}

/**
 * Opções para listar reuniões de mentoria
 */
export interface ListMentorshipMeetingsOptions {
  mentorshipId: string;
  status?: MeetingStatus | MeetingStatus[];
  limit?: number;
  page?: number;
  startAfter?: string;
  upcoming?: boolean;
}

/**
 * Resultado paginado de reuniões de mentoria
 */
export interface PaginatedMentorshipMeetingsResult {
  items: MentorshipMeeting[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  nextPageStartAfter?: string;
}
