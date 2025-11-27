'use client';

import React from 'react';

export interface AdminInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: string;
  helpText?: string;
  icon?: string;
}

export interface AdminTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  success?: string;
}

export interface AdminSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  success?: string;
  options: Array<{ value: string; label: string }>;
}

export function AdminInput({
  label,
  error,
  success,
  helpText,
  icon,
  className = '',
  ...props
}: AdminInputProps) {
  const hasError = !!error;
  const hasSuccess = !!success;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-light-secondary dark:text-text-dark-secondary text-xl">
            {icon}
          </span>
        )}
        <input
          className={`
            w-full px-4 py-2 ${icon ? 'pl-11' : ''}
            bg-surface-light dark:bg-surface-dark
            border-2 rounded-xl
            text-text-light-primary dark:text-text-dark-primary
            font-inter
            transition-all duration-300
            focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
            disabled:opacity-50 disabled:cursor-not-allowed
            ${hasError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
            ${hasSuccess ? 'border-green-500 focus:ring-green-500 focus:border-green-500' : ''}
            ${!hasError && !hasSuccess ? 'border-border-light dark:border-border-dark' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
          <span className="material-symbols-outlined text-base">error</span>
          {error}
        </p>
      )}
      {success && (
        <p className="mt-1 text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
          <span className="material-symbols-outlined text-base">check_circle</span>
          {success}
        </p>
      )}
      {helpText && !error && !success && (
        <p className="mt-1 text-sm text-text-light-tertiary dark:text-text-dark-tertiary">
          {helpText}
        </p>
      )}
    </div>
  );
}

export function AdminTextarea({
  label,
  error,
  success,
  className = '',
  ...props
}: AdminTextareaProps) {
  const hasError = !!error;
  const hasSuccess = !!success;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        className={`
          w-full px-4 py-2
          bg-surface-light dark:bg-surface-dark
          border-2 rounded-xl
          text-text-light-primary dark:text-text-dark-primary
          font-inter
          transition-all duration-300
          focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
          disabled:opacity-50 disabled:cursor-not-allowed
          resize-none
          ${hasError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
          ${hasSuccess ? 'border-green-500 focus:ring-green-500 focus:border-green-500' : ''}
          ${!hasError && !hasSuccess ? 'border-border-light dark:border-border-dark' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
          <span className="material-symbols-outlined text-base">error</span>
          {error}
        </p>
      )}
      {success && (
        <p className="mt-1 text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
          <span className="material-symbols-outlined text-base">check_circle</span>
          {success}
        </p>
      )}
    </div>
  );
}

export function AdminSelect({
  label,
  error,
  success,
  options,
  className = '',
  ...props
}: AdminSelectProps) {
  const hasError = !!error;
  const hasSuccess = !!success;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        className={`
          w-full px-4 py-2
          bg-surface-light dark:bg-surface-dark
          border-2 rounded-xl
          text-text-light-primary dark:text-text-dark-primary
          font-inter
          transition-all duration-300
          focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
          disabled:opacity-50 disabled:cursor-not-allowed
          ${hasError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
          ${hasSuccess ? 'border-green-500 focus:ring-green-500 focus:border-green-500' : ''}
          ${!hasError && !hasSuccess ? 'border-border-light dark:border-border-dark' : ''}
          ${className}
        `}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
          <span className="material-symbols-outlined text-base">error</span>
          {error}
        </p>
      )}
      {success && (
        <p className="mt-1 text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
          <span className="material-symbols-outlined text-base">check_circle</span>
          {success}
        </p>
      )}
    </div>
  );
}
