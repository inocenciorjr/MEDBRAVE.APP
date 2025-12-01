'use client';

export function MentorDashboardSkeleton() {
  return (
    <div className="space-y-6 lg:space-y-8 animate-pulse">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          <div className="h-4 w-64 bg-slate-100 dark:bg-slate-800 rounded mt-2" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-surface-light dark:bg-surface-dark rounded-2xl p-5 md:p-6
              border border-border-light dark:border-border-dark"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-3 flex-1">
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-10 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
              <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl" />
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700
                bg-slate-50 dark:bg-slate-800/50"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mentorados Overview */}
        <div className="lg:col-span-2 bg-surface-light dark:bg-surface-dark rounded-2xl p-6
          border border-border-light dark:border-border-dark">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded-xl" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl" />
              ))}
            </div>
          </div>
        </div>

        {/* Atividade Recente */}
        <div className="lg:col-span-1 bg-surface-light dark:bg-surface-dark rounded-2xl p-6
          border border-border-light dark:border-border-dark">
          <div className="space-y-4">
            <div className="h-6 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
