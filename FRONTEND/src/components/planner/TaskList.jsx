import React from 'react';
import TaskItem from './TaskItem';

export default function TaskList({ tasks, onComplete, onDelete, onOpenLink }) {
  if (!tasks || tasks.length === 0) {
    return <div className="text-muted-foreground p-4">Nenhuma tarefa para este dia.</div>;
  }
  return (
    <div className="space-y-2">
      {tasks.map(task => (
        <TaskItem
          key={task.id}
          task={task}
          onComplete={onComplete}
          onDelete={onDelete}
          onOpenLink={onOpenLink}
        />
      ))}
    </div>
  );
} 