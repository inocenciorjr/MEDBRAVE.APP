'use client';

interface TooltipProps {
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ text, position = 'top' }: TooltipProps) {
  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 transform -translate-x-1/2 -mt-[2px] border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-900 dark:border-t-slate-100',
    bottom: 'bottom-full left-1/2 transform -translate-x-1/2 -mb-[2px] border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-slate-900 dark:border-b-slate-100',
    left: 'left-full top-1/2 transform -translate-y-1/2 -ml-[2px] border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[6px] border-l-slate-900 dark:border-l-slate-100',
    right: 'right-full top-1/2 transform -translate-y-1/2 -mr-[2px] border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[6px] border-r-slate-900 dark:border-r-slate-100',
  };

  return (
    <span className={`absolute ${positionClasses[position]} px-3 py-1.5 
                     bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 
                     text-xs font-semibold rounded-lg whitespace-nowrap 
                     opacity-0 group-hover:opacity-100 transition-opacity duration-200 
                     pointer-events-none shadow-xl border-2 border-slate-700 dark:border-slate-300`}
          style={{ zIndex: 999999 }}>
      {text}
      <span className={`absolute ${arrowClasses[position]} w-0 h-0`}></span>
    </span>
  );
}
