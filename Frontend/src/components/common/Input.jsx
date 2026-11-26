import React, { forwardRef } from 'react';

export const Input = forwardRef(
  ({ label, error, helperText, className = '', containerClassName = '', ...props }, ref) => {
    return (
      <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
        {label && (
          <label className="text-xs font-medium text-text-secondary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`h-9 px-3 text-sm bg-bg-surface text-text-primary placeholder:text-text-secondary/50 border border-border-subtle rounded transition-colors focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 disabled:opacity-50 disabled:cursor-not-allowed ${
            error ? 'border-status-negative focus:border-status-negative focus:ring-status-negative/20' : ''
          } ${className}`}
          {...props}
        />
        {error ? (
          <span className="text-xs text-status-negative">{error}</span>
        ) : helperText ? (
          <span className="text-xs text-text-secondary">{helperText}</span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
