import { Skeleton } from "@/components/ui/skeleton";

export function MinhasListasSkeleton() {
  return (
    <>
      {/* Breadcrumb */}
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <Skeleton className="h-6 w-40" />
      </div>

      <div className="w-full py-8 animate-pulse">
        {/* Header */}
        <header className="mb-6">
          <Skeleton className="h-9 w-64" />
        </header>

        {/* Search and Actions Bar */}
        <div className="mb-6 bg-surface-light dark:bg-surface-dark rounded-lg shadow-md p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1">
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full sm:w-32" />
          </div>
        </div>

        {/* Filters Section */}
        <div className="mb-6 bg-surface-light dark:bg-surface-dark rounded-lg shadow-md p-4">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <Skeleton className="h-4 w-16" />
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
        </div>

        {/* Mobile: Cards */}
        <div className="md:hidden space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-md p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div>
                    <Skeleton className="h-5 w-40 mb-1" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
              <div className="flex items-center gap-4 mb-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>

        {/* Desktop: Table */}
        <div className="hidden md:block bg-surface-light dark:bg-surface-dark rounded-lg shadow-xl dark:shadow-dark-xl overflow-hidden">
          <table className="w-full text-left text-sm table-fixed">
            <thead className="border-b border-border-light dark:border-border-dark">
              <tr>
                <th className="py-3 px-4 w-[28%]">
                  <Skeleton className="h-4 w-16" />
                </th>
                <th className="py-3 px-3 w-[10%]">
                  <Skeleton className="h-4 w-12" />
                </th>
                <th className="py-3 px-3 w-[11%]">
                  <Skeleton className="h-4 w-12" />
                </th>
                <th className="py-3 px-3 w-[11%]">
                  <Skeleton className="h-4 w-20" />
                </th>
                <th className="py-3 px-3 w-[9%] text-center">
                  <Skeleton className="h-4 w-8 mx-auto" />
                </th>
                <th className="py-3 px-3 w-[9%] text-center">
                  <Skeleton className="h-4 w-16 mx-auto" />
                </th>
                <th className="py-3 px-3 w-[9%] text-center">
                  <Skeleton className="h-4 w-16 mx-auto" />
                </th>
                <th className="py-3 px-3 w-[9%] text-center">
                  <Skeleton className="h-4 w-16 mx-auto" />
                </th>
                <th className="py-3 px-3 w-[4%]"></th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <tr
                  key={i}
                  className="border-b border-border-light dark:border-border-dark"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-5 w-5 rounded" />
                      <Skeleton className="h-5 w-48" />
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </td>
                  <td className="py-3 px-3">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="py-3 px-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <Skeleton className="h-4 w-8 mx-auto" />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <Skeleton className="h-4 w-8 mx-auto" />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <Skeleton className="h-4 w-8 mx-auto" />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <Skeleton className="h-4 w-8 mx-auto" />
                  </td>
                  <td className="py-3 px-3">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
