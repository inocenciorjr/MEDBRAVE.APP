'use client';

import { forwardRef, InputHTMLAttributes } from 'react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  indeterminate?: boolean;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = '', label, indeterminate = false, checked, ...props }, ref) => {
    return (
      <label className="inline-flex items-center gap-2 cursor-pointer group">
        <div className="relative flex items-center justify-center">
          <input
            type="checkbox"
            ref={ref}
            checked={checked}
            className="peer sr-only"
            {...props}
          />
          
          {/* Checkbox visual */}
          <div
            className={`
              w-5 h-5 rounded-sm border-2 transition-all duration-200 ease-out
              flex items-center justify-center
              ${
                checked || indeterminate
                  ? 'bg-primary border-primary scale-100 group-hover:bg-primary/90 group-hover:shadow-md'
                  : 'bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark group-hover:border-primary/50 group-hover:bg-gray-100 dark:group-hover:bg-gray-800'
              }
              peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30 peer-focus-visible:ring-offset-2
              peer-disabled:opacity-50 peer-disabled:cursor-not-allowed
              ${className}
            `}
          >
            {/* Checkmark icon */}
            {checked && !indeterminate && (
              <svg
                className="w-3.5 h-3.5 text-white animate-in zoom-in-50 duration-200"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M13.5 4L6 11.5L2.5 8"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            
            {/* Indeterminate icon */}
            {indeterminate && (
              <svg
                className="w-3 h-3 text-white animate-in zoom-in-50 duration-200"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 8H13"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </div>
        </div>
        
        {label && (
          <span className="text-sm text-text-light-primary dark:text-text-dark-primary select-none">
            {label}
          </span>
        )}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
