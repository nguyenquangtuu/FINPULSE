import React, { forwardRef, useState, useEffect, useRef } from 'react';

/**
 * Format a number to Vietnamese readable scale (e.g., 1.5 triệu, 50 nghìn)
 */
export const formatVNWords = (amount) => {
  const num = Number(amount);
  if (!num || isNaN(num) || num <= 0) return '';

  if (num >= 1_000_000_000) {
    const val = (num / 1_000_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
    return `${val} tỷ đồng`;
  }
  if (num >= 1_000_000) {
    const val = (num / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
    return `${val} triệu đồng`;
  }
  if (num >= 1_000) {
    const val = (num / 1_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
    return `${val} nghìn đồng`;
  }
  return `${num} đồng`;
};

export const CurrencyInput = forwardRef(
  (
    {
      label,
      value,
      onChange,
      name,
      placeholder = '0',
      error,
      helperText,
      suffix = 'đ',
      showWordHelper = true,
      quickPresets = false,
      required = false,
      disabled = false,
      className = '',
      containerClassName = '',
      ...props
    },
    ref
  ) => {
    const internalInputRef = useRef(null);
    const inputRef = ref || internalInputRef;

    // Convert parent value to raw digits string
    const rawDigits =
      value !== undefined && value !== null && value !== ''
        ? String(value).replace(/\D/g, '')
        : '';

    // Formatted display value: e.g. "50.000"
    const displayValue = rawDigits ? Number(rawDigits).toLocaleString('vi-VN') : '';

    const handleInputChange = (e) => {
      const input = e.target;
      const currentVal = input.value;
      const digits = currentVal.replace(/\D/g, '');

      // Strip leading zeros unless it's single "0"
      const cleanDigits = digits.replace(/^0+(?=\d)/, '');

      if (onChange) {
        onChange({
          ...e,
          target: {
            ...e.target,
            name: e.target.name || name,
            value: cleanDigits,
            valueAsNumber: cleanDigits ? Number(cleanDigits) : 0,
          },
        });
      }
    };

    const handleAddPreset = (amountToAdd) => {
      const current = Number(rawDigits) || 0;
      const next = current + amountToAdd;
      if (onChange) {
        onChange({
          target: {
            name,
            value: String(next),
            valueAsNumber: next,
          },
        });
      }
    };

    const wordHelper = showWordHelper && Number(rawDigits) >= 1000 ? formatVNWords(rawDigits) : '';

    return (
      <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
        {label && (
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-text-secondary">
              {label} {required && <span className="text-status-negative">*</span>}
            </label>
            {wordHelper && (
              <span className="text-[11px] font-medium text-accent-primary animate-fadeIn">
                ≈ {wordHelper}
              </span>
            )}
          </div>
        )}

        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            name={name}
            value={displayValue}
            onChange={handleInputChange}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            className={`h-9 w-full pl-3 pr-9 text-sm font-semibold tracking-wide bg-bg-surface text-text-primary placeholder:text-text-secondary/50 placeholder:font-normal border border-border-subtle rounded transition-colors focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 disabled:opacity-50 disabled:cursor-not-allowed ${
              error ? 'border-status-negative focus:border-status-negative focus:ring-status-negative/20' : ''
            } ${className}`}
            {...props}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-secondary select-none pointer-events-none">
            {suffix}
          </span>
        </div>

        {/* Quick add shortcuts if enabled */}
        {quickPresets && !disabled && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {[50000, 100000, 500000, 1000000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleAddPreset(preset)}
                className="text-[10px] font-medium px-2 py-0.5 rounded bg-bg-elevated border border-border-subtle hover:border-accent-primary hover:text-accent-primary text-text-secondary transition-colors cursor-pointer"
              >
                +{Number(preset).toLocaleString('vi-VN')} {suffix}
              </button>
            ))}
          </div>
        )}

        {error ? (
          <span className="text-xs text-status-negative">{error}</span>
        ) : helperText ? (
          <span className="text-xs text-text-secondary">{helperText}</span>
        ) : null}
      </div>
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';
