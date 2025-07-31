import React, { useEffect, useState } from 'react';
import { alertService } from '../services/alertService';
import { XCircle, AlertTriangle, Info } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';

const severityConfig = {
  danger: { icon: <XCircle className="w-4 h-4" />, color: 'red' },
  warning: { icon: <AlertTriangle className="w-4 h-4" />, color: 'yellow' },
  info: { icon: <Info className="w-4 h-4" />, color: 'blue' },
};

export const AlertCenter = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const list = await alertService.listUnread();
      setAlerts(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    await alertService.markAsRead(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  if (loading) return <div className="p-4 text-sm">Carregando alertas…</div>;
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((a) => {
        const cfg = severityConfig[a.type] || severityConfig.info;
        return (
          <div
            key={a.id}
            className={`flex items-start gap-3 p-4 rounded-lg transition-colors duration-200 hover:shadow-md`}
            style={{
              background: `linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)`,
              border: `1px solid var(--border-color)`,
            }}
          >
            <span className={`flex-shrink-0 text-${cfg.color}-600`}>{cfg.icon}</span>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {a.message}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {formatDate(a.createdAt._seconds * 1000)}
              </p>
            </div>
            <button
              className="px-2 py-1 text-xs rounded-md bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              onClick={() => markAsRead(a.id)}
            >
              Ok!
            </button>
          </div>
        );
      })}
    </div>
  );
};