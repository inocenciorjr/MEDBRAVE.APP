import React, { useState, useEffect } from 'react';
import plannerApi from '../services/plannerApi';

export default function PlannerStats({ userId }) {
  const [stats, setStats] = useState({
    tasksToday: 0,
    completedToday: 0,
    loading: true
  });

  useEffect(() => {
    async function loadStats() {
      if (!userId) {
        setStats({ tasksToday: 0, completedToday: 0, loading: false });
        return;
      }

      try {
        const today = new Date().toISOString().slice(0, 10);
        const tasks = await plannerApi.getTasks(userId, today, today);
        
        const tasksToday = tasks.length;
        const completedToday = tasks.filter(task => task.status === 'COMPLETED').length;
        
        setStats({ tasksToday, completedToday, loading: false });
      } catch (error) {
        console.error('Erro ao carregar estatísticas do planner:', error);
        setStats({ tasksToday: 0, completedToday: 0, loading: false });
      }
    }

    loadStats();
  }, [userId]);

  if (stats.loading) {
    return (
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="text-center p-3 rounded-lg" style={{background: 'var(--bg-primary)'}}>
          <div className="text-lg font-bold text-gray-400">...</div>
          <div style={{color: 'var(--text-secondary)'}}>Tarefas Hoje</div>
        </div>
        <div className="text-center p-3 rounded-lg" style={{background: 'var(--bg-primary)'}}>
          <div className="text-lg font-bold text-gray-400">...</div>
          <div style={{color: 'var(--text-secondary)'}}>Concluídas</div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 text-sm">
      <div className="text-center p-3 rounded-lg" style={{background: 'var(--bg-primary)'}}>
        <div className="text-lg font-bold text-blue-500">{stats.tasksToday}</div>
        <div style={{color: 'var(--text-secondary)'}}>Tarefas Hoje</div>
      </div>
      <div className="text-center p-3 rounded-lg" style={{background: 'var(--bg-primary)'}}>
        <div className="text-lg font-bold text-green-500">{stats.completedToday}</div>
        <div style={{color: 'var(--text-secondary)'}}>Concluídas</div>
      </div>
    </div>
  );
}