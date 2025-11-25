'use client';

import { Task } from '@/types';
import Calendar from './Calendar';
import TaskList from './TaskList';

interface RightSidebarProps {
  tasks: Task[];
}

export default function RightSidebar({ tasks }: RightSidebarProps) {
  return (
    <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg shadow-xl dark:shadow-dark-xl">
      {/* Calendar */}
      <Calendar />
      
      {/* Divider */}
      <div className="border-t border-border-light dark:border-border-dark my-6"></div>
      
      {/* Task List */}
      <TaskList tasks={tasks} />
    </div>
  );
}
