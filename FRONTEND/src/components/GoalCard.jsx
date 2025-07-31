import React from 'react';
import { Circle } from 'rc-progress';

export const GoalCard = ({ goal, progress }) => {
  // Validar valores para evitar NaN
  const safeProgress = typeof progress === 'number' && !isNaN(progress) ? progress : 0;
  const safeTargetValue = typeof goal?.targetValue === 'number' && !isNaN(goal.targetValue) && goal.targetValue > 0 ? goal.targetValue : 1;
  
  const pct = Math.min(100, Math.round((safeProgress / safeTargetValue) * 100));
  const color = pct >= 100 ? '#10b981' : '#6366f1';

  // gradient colors can be customized per specialty or goal type later

  return (
    <div
      className="flex items-center p-5 rounded-xl transition-colors duration-200 hover:shadow-lg"
      style={{
        background: `linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)`,
        border: '1px solid var(--border-color)',
      }}
    >
      <Circle
        percent={pct}
        strokeWidth={6}
        strokeColor={color}
        trailColor="#e5e7eb"
        trailWidth={6}
        style={{ width: 64, height: 64 }}
      />
      <div className="ml-5">
        <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {goal.name}
        </h4>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {safeProgress} de {safeTargetValue} • {pct}%
        </p>
      </div>
    </div>
  );
};