import React from 'react';

export const SpecialtyTrendChart = ({ data }) => {
  if (!data || data.length === 0) return null;

  const width = 240;
  const height = 80;
  
  // Validar dados e evitar NaN
  const validData = data.filter(d => d && typeof d.accuracy === 'number' && !isNaN(d.accuracy));
  if (validData.length === 0) return null;
  
  const maxAcc = Math.max(...validData.map(d => d.accuracy));
  if (maxAcc === 0 || isNaN(maxAcc)) return null;
  
  const points = validData.map((d, i) => {
    const x = validData.length === 1 ? width / 2 : (i / (validData.length - 1)) * width;
    const y = height - (d.accuracy / maxAcc) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="trend-chart overflow-visible">
      <defs>
        <linearGradient id="trendGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke="url(#trendGradient)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        style={{
          filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.1))',
          animation: 'dash 1.5s ease-out forwards',
          strokeDasharray: 1000,
          strokeDashoffset: 1000,
        }}
      />
      {/* Circle marker at latest point */}
      {(() => {
        const last = validData[validData.length - 1];
        if (!last || isNaN(last.accuracy)) return null;
        const x = validData.length === 1 ? width / 2 : width;
        const y = height - (last.accuracy / maxAcc) * height;
        return <circle cx={x} cy={y} r={4} fill="#10b981" />;
      })()}
      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </svg>
  );
};