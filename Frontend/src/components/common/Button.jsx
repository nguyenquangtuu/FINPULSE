import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  icon: Icon,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none';

  const variants = {
    primary: 'bg-accent-primary hover:bg-accent-hover text-white shadow-sm border border-transparent',
    secondary: 'bg-bg-surface hover:bg-bg-elevated text-text-primary border border-border-subtle shadow-sm',
    destructive: 'bg-status-negative/10 hover:bg-status-negative/20 text-status-negative border border-status-negative/30',
    ghost: 'hover:bg-bg-elevated text-text-secondary hover:text-text-primary border border-transparent',
    outline: 'border border-border-subtle hover:bg-bg-surface text-text-primary',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 rounded-sm gap-1.5 h-8',
    md: 'text-sm px-3.5 py-2 rounded gap-2 h-9',
    lg: 'text-base px-4 py-2.5 rounded-md gap-2.5 h-11',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : Icon ? (
        <Icon className="w-4 h-4 text-current" />
      ) : null}
      {children}
    </button>
  );
};
