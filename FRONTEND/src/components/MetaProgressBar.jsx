import React from 'react';

export const MetaProgressBar = ({ value, target, label }) => {
  const pct = Math.min(100, Math.round((value / target) * 100));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
        <span>{label}</span>
        <span>{value} de {target}</span>
      </div>
      <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: pct + '%',
            background: 'linear-gradient(90deg, #a78bfa 0%, #6366f1 50%, #4f46e5 100%)',
          }}
        ></div>
      </div>
    </div>
  );
}; 