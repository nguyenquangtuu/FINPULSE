import React, { forwardRef } from 'react';

export const Select = forwardRef(
  ({ label, error, children, className = '', containerClassName = '', ...props }, ref) => {
    return (
      <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
        {label && (
          <label className="text-xs font-medium text-text-secondary">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`h-9 px-3 text-sm bg-bg-surface text-text-primary border border-border-subtle rounded transition-colors focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 cursor-pointer ${
            error ? 'border-status-negative' : ''
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        {error && <span className="text-xs text-status-negative">{error}</span>}
      </div>
    );
  }
);

Select.displayName = 'Select';
