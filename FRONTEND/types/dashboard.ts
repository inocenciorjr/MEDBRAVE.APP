export interface User {
  id: string;
  name: string;
  avatar: string;
  email: string;
}

export interface Tag {
  id: string;
  label: string;
  color: string;
}

export interface Participant {
  id: string;
  name: string;
  avatar: string;
}

export interface Simulado {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  tags: Tag[];
  participants: Participant[];
  totalParticipants: number;
  progress: number;
  filesCount: number;
  questionsCount: number;
  theme: 'violet' | 'indigo' | 'fuchsia';
}

export interface ActivityData {
  day: string;
  hours: number;
  minutes: number;
  date: string;
}

export interface TaskCategory {
  name: string;
  count: number;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  time: string;
  priority: 'high' | 'normal';
  completed: boolean;
}

export interface Delivery {
  id: string;
  title: string;
  course: string;
  dueDate: string;
}

export interface DashboardData {
  user: User;
  simulados: Simulado[];
  activityData: ActivityData[];
  taskCategories: TaskCategory[];
  tasks: Task[];
  nextDelivery: Delivery;
  currentDate: Date;
}
