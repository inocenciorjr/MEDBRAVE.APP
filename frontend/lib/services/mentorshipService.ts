import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

// ==================== TIPOS ====================

export enum MentorshipStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum MeetingStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  RESCHEDULED = 'rescheduled',
}

export enum MeetingType {
  VIDEO = 'video',
  AUDIO = 'audio',
  CHAT = 'chat',
  IN_PERSON = 'in-person',
}

export enum ObjectiveStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ResourceType {
  LINK = 'link',
  FILE = 'file',
  VIDEO = 'video',
  ARTICLE = 'article',
  OTHER = 'other',
}

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
  createdAt: string;
  updatedAt: string;
}

export interface Mentorship {
  id: string;
  mentorId: string;
  menteeId: string;
  title: string;
  description?: string;
  status: MentorshipStatus;
  startDate: string;
  endDate?: string | null;
  meetingFrequency?: string;
  totalMeetings?: number;
  completedMeetings?: number;
  objectives?: string[];
  rating: number | null;
  feedback: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MentorshipMeeting {
  id: string;
  mentorshipId: string;
  scheduledDate: string;
  actualDate?: string | null;
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
  createdAt: string;
  updatedAt: string;
}

export interface MentorshipObjective {
  id: string;
  mentorshipId: string;
  title: string;
  description?: string | null;
  status: ObjectiveStatus;
  targetDate?: string | null;
  completedDate?: string | null;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface MentorshipFeedback {
  id: string;
  mentorshipId: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  rating?: number | null;
  meetingId?: string | null;
  isAnonymous: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MentorshipResource {
  id: string;
  mentorshipId: string;
  addedByUserId: string;
  title: string;
  type: ResourceType;
  url: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MentorshipSimulatedExam {
  id: string;
  mentorshipId: string;
  simulatedExamId: string;
  assignedByUserId: string;
  assignedDate: string;
  dueDate?: string | null;
  completedDate?: string | null;
  score?: number | null;
  createdAt: string;
  updatedAt: string;
}

// Interface para resposta da API
interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: {
    total: number;
    page: number;
    totalPages: number;
  };
  error?: string;
}

// Helper para fazer requisições e parsear JSON
async function apiRequest<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetchWithAuth(url, options);
  return response.json();
}

// ==================== MENTOR PROFILES ====================

export const mentorProfileService = {
  async createProfile(data: {
    specialties: string[];
    biography: string;
    experience: string[];
    education: string[];
    availability: { days: number[]; startTime: string; endTime: string }[];
  }): Promise<MentorProfile> {
    const response = await apiRequest<MentorProfile>('/mentorship/profiles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async updateProfile(data: Partial<MentorProfile>): Promise<MentorProfile> {
    const response = await apiRequest<MentorProfile>('/mentorship/profiles', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async getMyProfile(): Promise<MentorProfile | null> {
    try {
      const response = await apiRequest<MentorProfile>('/mentorship/profiles/me');
      return response.data;
    } catch {
      return null;
    }
  },

  async getProfileByUserId(userId: string): Promise<MentorProfile | null> {
    try {
      const response = await apiRequest<MentorProfile>(`/mentorship/profiles/${userId}`);
      return response.data;
    } catch {
      return null;
    }
  },

  async listProfiles(limit = 10, page = 1): Promise<{ profiles: MentorProfile[]; total: number; totalPages: number }> {
    const response = await apiRequest<MentorProfile[]>(`/mentorship/profiles?limit=${limit}&page=${page}`);
    return { profiles: response.data, total: response.pagination?.total || 0, totalPages: response.pagination?.totalPages || 1 };
  },

  async findBySpecialty(specialty: string, limit = 10, page = 1): Promise<{ profiles: MentorProfile[]; total: number }> {
    const response = await apiRequest<MentorProfile[]>(`/mentorship/profiles/specialty/${encodeURIComponent(specialty)}?limit=${limit}&page=${page}`);
    return { profiles: response.data, total: response.pagination?.total || 0 };
  },

  async checkIsMentor(userId: string): Promise<boolean> {
    const response = await apiRequest<{ isMentor: boolean }>(`/mentorship/profiles/check/${userId}`);
    return response.data?.isMentor || false;
  },
};

// ==================== MENTORSHIPS ====================

export const mentorshipService = {
  async createMentorship(data: {
    mentorId: string;
    title: string;
    description?: string;
    meetingFrequency?: string;
    totalMeetings?: number;
    objectives?: string[];
  }): Promise<Mentorship> {
    const response = await apiRequest<Mentorship>('/mentorship', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async getMentorshipById(id: string): Promise<Mentorship | null> {
    try {
      const response = await apiRequest<Mentorship>(`/mentorship/${id}`);
      return response.data;
    } catch {
      return null;
    }
  },

  async listMentorships(options?: {
    mentorId?: string;
    menteeId?: string;
    status?: MentorshipStatus | MentorshipStatus[];
    limit?: number;
    page?: number;
  }): Promise<{ items: Mentorship[]; total: number; totalPages: number }> {
    const params = new URLSearchParams();
    if (options?.mentorId) params.append('mentorId', options.mentorId);
    if (options?.menteeId) params.append('menteeId', options.menteeId);
    if (options?.status) {
      if (Array.isArray(options.status)) {
        options.status.forEach(s => params.append('status', s));
      } else {
        params.append('status', options.status);
      }
    }
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.page) params.append('page', options.page.toString());

    const response = await apiRequest<Mentorship[]>(`/mentorship?${params.toString()}`);
    return { items: response.data, total: response.pagination?.total || 0, totalPages: response.pagination?.totalPages || 1 };
  },

  async getMyMentorshipsAsMentor(status?: MentorshipStatus[]): Promise<Mentorship[]> {
    const params = status ? `?status=${status.join(',')}` : '';
    const response = await apiRequest<Mentorship[]>(`/mentorship/me/mentor${params}`);
    return response.data;
  },

  async getMyMentorshipsAsMentee(status?: MentorshipStatus[]): Promise<Mentorship[]> {
    const params = status ? `?status=${status.join(',')}` : '';
    const response = await apiRequest<Mentorship[]>(`/mentorship/me/mentee${params}`);
    return response.data;
  },

  async acceptMentorship(id: string): Promise<Mentorship> {
    const response = await apiRequest<Mentorship>(`/mentorship/${id}/accept`, { method: 'PUT' });
    return response.data;
  },

  async cancelMentorship(id: string, reason?: string): Promise<Mentorship> {
    const response = await apiRequest<Mentorship>(`/mentorship/${id}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
    return response.data;
  },

  async completeMentorship(id: string, rating?: number, feedback?: string): Promise<Mentorship> {
    const response = await apiRequest<Mentorship>(`/mentorship/${id}/complete`, {
      method: 'PUT',
      body: JSON.stringify({ rating, feedback }),
    });
    return response.data;
  },

  async updateObjectives(id: string, objectives: string[]): Promise<Mentorship> {
    const response = await apiRequest<Mentorship>(`/mentorship/${id}/objectives`, {
      method: 'PUT',
      body: JSON.stringify({ objectives }),
    });
    return response.data;
  },
};

// ==================== MEETINGS ====================

export const mentorshipMeetingService = {
  async createMeeting(data: {
    mentorshipId: string;
    scheduledDate: string;
    duration: number;
    meetingType: MeetingType;
    meetingLink?: string;
    meetingLocation?: string;
    agenda: string;
  }): Promise<MentorshipMeeting> {
    const response = await apiRequest<MentorshipMeeting>('/mentorship/meetings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async getMeetingById(id: string): Promise<MentorshipMeeting | null> {
    try {
      const response = await apiRequest<MentorshipMeeting>(`/mentorship/meetings/${id}`);
      return response.data;
    } catch {
      return null;
    }
  },

  async getMeetingsByMentorship(mentorshipId: string): Promise<MentorshipMeeting[]> {
    const response = await apiRequest<MentorshipMeeting[]>(`/mentorship/meetings/mentorship/${mentorshipId}`);
    return response.data;
  },

  async getUpcomingMeetings(mentorshipId: string): Promise<MentorshipMeeting[]> {
    const response = await apiRequest<MentorshipMeeting[]>(`/mentorship/meetings/mentorship/${mentorshipId}/upcoming`);
    return response.data;
  },

  async completeMeeting(id: string, data: {
    actualDate: string;
    actualDuration: number;
    notes?: string;
    mentorFeedback?: string;
    studentFeedback?: string;
  }): Promise<MentorshipMeeting> {
    const response = await apiRequest<MentorshipMeeting>(`/mentorship/meetings/${id}/complete`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async cancelMeeting(id: string, reason?: string): Promise<MentorshipMeeting> {
    const response = await apiRequest<MentorshipMeeting>(`/mentorship/meetings/${id}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
    return response.data;
  },

  async rescheduleMeeting(id: string, newDate: string, options?: {
    newDuration?: number;
    newMeetingType?: MeetingType;
    newMeetingLink?: string;
    newAgenda?: string;
    reason?: string;
  }): Promise<MentorshipMeeting> {
    const response = await apiRequest<MentorshipMeeting>(`/mentorship/meetings/${id}/reschedule`, {
      method: 'PUT',
      body: JSON.stringify({ newDate, ...options }),
    });
    return response.data;
  },

  async addNotes(id: string, notes: string): Promise<MentorshipMeeting> {
    const response = await apiRequest<MentorshipMeeting>(`/mentorship/meetings/${id}/notes`, {
      method: 'PUT',
      body: JSON.stringify({ notes }),
    });
    return response.data;
  },
};

// ==================== OBJECTIVES ====================

export const mentorshipObjectiveService = {
  async createObjective(data: {
    mentorshipId: string;
    title: string;
    description?: string;
    targetDate?: string;
  }): Promise<MentorshipObjective> {
    const response = await apiRequest<MentorshipObjective>('/mentorship/objectives', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async getObjectiveById(id: string): Promise<MentorshipObjective | null> {
    try {
      const response = await apiRequest<MentorshipObjective>(`/mentorship/objectives/${id}`);
      return response.data;
    } catch {
      return null;
    }
  },

  async getObjectivesByMentorship(mentorshipId: string): Promise<MentorshipObjective[]> {
    const response = await apiRequest<MentorshipObjective[]>(`/mentorship/objectives/mentorship/${mentorshipId}`);
    return response.data;
  },

  async updateObjective(id: string, data: Partial<MentorshipObjective>): Promise<MentorshipObjective> {
    const response = await apiRequest<MentorshipObjective>(`/mentorship/objectives/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async updateProgress(id: string, progress: number): Promise<MentorshipObjective> {
    const response = await apiRequest<MentorshipObjective>(`/mentorship/objectives/${id}/progress`, {
      method: 'PUT',
      body: JSON.stringify({ progress }),
    });
    return response.data;
  },

  async completeObjective(id: string): Promise<MentorshipObjective> {
    const response = await apiRequest<MentorshipObjective>(`/mentorship/objectives/${id}/complete`, { method: 'PUT' });
    return response.data;
  },

  async cancelObjective(id: string): Promise<MentorshipObjective> {
    const response = await apiRequest<MentorshipObjective>(`/mentorship/objectives/${id}/cancel`, { method: 'PUT' });
    return response.data;
  },

  async deleteObjective(id: string): Promise<void> {
    await fetchWithAuth(`/mentorship/objectives/${id}`, { method: 'DELETE' });
  },
};

// ==================== FEEDBACKS ====================

export const mentorshipFeedbackService = {
  async createFeedback(data: {
    mentorshipId: string;
    toUserId: string;
    content: string;
    rating?: number;
    meetingId?: string;
    isAnonymous?: boolean;
  }): Promise<MentorshipFeedback> {
    const response = await apiRequest<MentorshipFeedback>('/mentorship/feedbacks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async getFeedbackById(id: string): Promise<MentorshipFeedback | null> {
    try {
      const response = await apiRequest<MentorshipFeedback>(`/mentorship/feedbacks/${id}`);
      return response.data;
    } catch {
      return null;
    }
  },

  async getFeedbacksByMentorship(mentorshipId: string): Promise<MentorshipFeedback[]> {
    const response = await apiRequest<MentorshipFeedback[]>(`/mentorship/feedbacks/mentorship/${mentorshipId}`);
    return response.data;
  },

  async getMyReceivedFeedbacks(): Promise<MentorshipFeedback[]> {
    const response = await apiRequest<MentorshipFeedback[]>('/mentorship/feedbacks/me/received');
    return response.data;
  },

  async getMyGivenFeedbacks(): Promise<MentorshipFeedback[]> {
    const response = await apiRequest<MentorshipFeedback[]>('/mentorship/feedbacks/me/given');
    return response.data;
  },

  async getAverageRating(userId: string): Promise<number | null> {
    const response = await apiRequest<{ averageRating: number | null }>(`/mentorship/feedbacks/user/${userId}/rating`);
    return response.data?.averageRating || null;
  },

  async updateFeedback(id: string, data: Partial<MentorshipFeedback>): Promise<MentorshipFeedback> {
    const response = await apiRequest<MentorshipFeedback>(`/mentorship/feedbacks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async deleteFeedback(id: string): Promise<void> {
    await fetchWithAuth(`/mentorship/feedbacks/${id}`, { method: 'DELETE' });
  },
};

// ==================== RESOURCES ====================

export const mentorshipResourceService = {
  async createResource(data: {
    mentorshipId: string;
    title: string;
    type: ResourceType;
    url: string;
    description?: string;
  }): Promise<MentorshipResource> {
    const response = await apiRequest<MentorshipResource>('/mentorship/resources', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async getResourceById(id: string): Promise<MentorshipResource | null> {
    try {
      const response = await apiRequest<MentorshipResource>(`/mentorship/resources/${id}`);
      return response.data;
    } catch {
      return null;
    }
  },

  async getResourcesByMentorship(mentorshipId: string): Promise<MentorshipResource[]> {
    const response = await apiRequest<MentorshipResource[]>(`/mentorship/resources/mentorship/${mentorshipId}`);
    return response.data;
  },

  async getResourcesByType(mentorshipId: string, type: ResourceType): Promise<MentorshipResource[]> {
    const response = await apiRequest<MentorshipResource[]>(`/mentorship/resources/mentorship/${mentorshipId}/type/${type}`);
    return response.data;
  },

  async getMyResources(): Promise<MentorshipResource[]> {
    const response = await apiRequest<MentorshipResource[]>('/mentorship/resources/me');
    return response.data;
  },

  async updateResource(id: string, data: Partial<MentorshipResource>): Promise<MentorshipResource> {
    const response = await apiRequest<MentorshipResource>(`/mentorship/resources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async deleteResource(id: string): Promise<void> {
    await fetchWithAuth(`/mentorship/resources/${id}`, { method: 'DELETE' });
  },
};

// ==================== SIMULATED EXAMS ====================

export const mentorshipSimulatedExamService = {
  async assignSimulatedExam(data: {
    mentorshipId: string;
    simulatedExamId: string;
    dueDate?: string;
  }): Promise<MentorshipSimulatedExam> {
    const response = await apiRequest<MentorshipSimulatedExam>('/mentorship/simulated-exams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async getSimulatedExamById(id: string): Promise<MentorshipSimulatedExam | null> {
    try {
      const response = await apiRequest<MentorshipSimulatedExam>(`/mentorship/simulated-exams/${id}`);
      return response.data;
    } catch {
      return null;
    }
  },

  async getSimulatedExamsByMentorship(mentorshipId: string): Promise<MentorshipSimulatedExam[]> {
    const response = await apiRequest<MentorshipSimulatedExam[]>(`/mentorship/simulated-exams/mentorship/${mentorshipId}`);
    return response.data;
  },

  async getPendingSimulatedExams(mentorshipId: string): Promise<MentorshipSimulatedExam[]> {
    const response = await apiRequest<MentorshipSimulatedExam[]>(`/mentorship/simulated-exams/mentorship/${mentorshipId}/pending`);
    return response.data;
  },

  async getMyAssignedExams(): Promise<MentorshipSimulatedExam[]> {
    const response = await apiRequest<MentorshipSimulatedExam[]>('/mentorship/simulated-exams/me/assigned');
    return response.data;
  },

  async completeSimulatedExam(id: string, score: number): Promise<MentorshipSimulatedExam> {
    const response = await apiRequest<MentorshipSimulatedExam>(`/mentorship/simulated-exams/${id}/complete`, {
      method: 'PUT',
      body: JSON.stringify({ score }),
    });
    return response.data;
  },

  async updateSimulatedExam(id: string, data: Partial<MentorshipSimulatedExam>): Promise<MentorshipSimulatedExam> {
    const response = await apiRequest<MentorshipSimulatedExam>(`/mentorship/simulated-exams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async removeSimulatedExam(id: string): Promise<void> {
    await fetchWithAuth(`/mentorship/simulated-exams/${id}`, { method: 'DELETE' });
  },
};
