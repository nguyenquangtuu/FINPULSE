import React from 'react';

export const Badge = ({ children, variant = 'neutral', className = '' }) => {
  const variants = {
    positive: 'bg-status-positive/10 text-status-positive border-status-positive/30',
    negative: 'bg-status-negative/10 text-status-negative border-status-negative/30',
    warning: 'bg-status-warning/10 text-status-warning border-status-warning/30',
    neutral: 'bg-bg-elevated text-text-secondary border-border-subtle',
    accent: 'bg-accent-primary/10 text-accent-primary border-accent-primary/30',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium border ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
