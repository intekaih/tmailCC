'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// Toast types and interfaces
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Toast hook for managing toasts
export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = (toast: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts(prev => [...prev, { ...toast, id }]);
    
    // Auto remove after duration
    const duration = toast.duration ?? 3000;
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const toast = {
    success: (message: string, options?: Partial<ToastItem>) => 
      addToast({ message, type: 'success', ...options }),
    error: (message: string, options?: Partial<ToastItem>) => 
      addToast({ message, type: 'error', ...options }),
    info: (message: string, options?: Partial<ToastItem>) => 
      addToast({ message, type: 'info', ...options }),
    warning: (message: string, options?: Partial<ToastItem>) => 
      addToast({ message, type: 'warning', ...options }),
  };

  return { toasts, addToast, removeToast, toast };
}

// Icon components for each toast type
const ToastIcons = {
  success: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  error: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  ),
  warning: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  ),
};

// Toast styles based on type
const toastStyles: Record<ToastType, string> = {
  success: 'toast-success',
  error: 'toast-error',
  info: 'toast-info',
  warning: 'toast-warning',
};

const toastIconColors: Record<ToastType, string> = {
  success: 'var(--success)',
  error: 'var(--error)',
  info: 'var(--accent)',
  warning: 'var(--warning)',
};

// Individual toast component
function Toast({ 
  toast, 
  onRemove,
  position = 'bottom-center'
}: { 
  toast: ToastItem;
  onRemove: (id: string) => void;
  position?: 'bottom-center' | 'top-center' | 'bottom-left' | 'bottom-right';
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 300);
  };

  const positionClasses = {
    'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
    'top-center': 'top-6 left-1/2 -translate-x-1/2',
    'bottom-left': 'bottom-6 left-6',
    'bottom-right': 'bottom-6 right-6',
  };

  return (
    <div
      className={`
        fixed ${positionClasses[position]} z-[9999] flex items-center gap-3
        px-4 py-3 rounded-xl text-sm font-medium
        shadow-lg shadow-black/20 backdrop-blur-sm
        border transition-all duration-300 ease-out
        ${toastStyles[toast.type]}
        ${isVisible && !isLeaving ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
      role="alert"
      aria-live="polite"
    >
      {/* Icon */}
      <span style={{ color: toastIconColors[toast.type] }} className="flex-shrink-0">
        {ToastIcons[toast.type]}
      </span>

      {/* Message */}
      <span className="flex-1 text-[var(--text-primary)]">{toast.message}</span>

      {/* Action button if provided */}
      {toast.action && (
        <button
          className="px-2 py-1 text-xs font-semibold rounded-md bg-white/10 hover:bg-white/20 transition-colors"
          onClick={() => {
            toast.action?.onClick();
            handleClose();
          }}
        >
          {toast.action.label}
        </button>
      )}

      {/* Close button */}
      <button
        className="flex-shrink-0 p-1 rounded-md hover:bg-white/10 transition-colors opacity-60 hover:opacity-100"
        onClick={handleClose}
        aria-label="Dismiss"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Progress bar for auto-dismiss */}
      {(toast.duration ?? 3000) > 0 && (
        <div 
          className="absolute bottom-0 left-0 h-0.5 bg-white/30 rounded-b-xl animate-shrink"
          style={{ 
            animationDuration: `${toast.duration ?? 3000}ms`,
          }}
        />
      )}
    </div>
  );
}

// Toast container with portal
interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
  position?: 'bottom-center' | 'top-center' | 'bottom-left' | 'bottom-right';
  maxToasts?: number;
}

export function ToastContainer({ 
  toasts, 
  onRemove, 
  position = 'bottom-center',
  maxToasts = 5 
}: ToastContainerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Limit number of visible toasts
  const visibleToasts = toasts.slice(-maxToasts);

  return createPortal(
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      {visibleToasts.map((toast, index) => (
        <div 
          key={toast.id} 
          className="pointer-events-auto"
          style={{
            position: 'absolute',
            bottom: position.startsWith('bottom') 
              ? `${24 + index * 72}px` 
              : undefined,
            top: position.startsWith('top')
              ? `${24 + index * 72}px`
              : undefined,
            left: position.endsWith('center')
              ? '50%'
              : '24px',
            right: position.endsWith('right') || (!position.endsWith('center') && !position.endsWith('left'))
              ? '24px'
              : undefined,
            transform: position.endsWith('center')
              ? 'translateX(-50%)'
              : undefined,
          }}
        >
          <Toast 
            toast={toast} 
            onRemove={onRemove}
            position={position}
          />
        </div>
      ))}
    </div>,
    document.body
  );
}

// Animated progress bar component
interface AnimatedProgressProps {
  value: number;
  max?: number;
  variant?: 'linear' | 'circular';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function AnimatedProgress({
  value,
  max = 100,
  variant = 'linear',
  size = 'md',
  showLabel = false,
  className = ''
}: AnimatedProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  if (variant === 'circular') {
    const strokeWidth = size === 'sm' ? 3 : size === 'md' ? 4 : 5;
    const radius = 45 - strokeWidth;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div className={`relative inline-flex items-center justify-center ${className}`}>
        <svg className="transform -rotate-90" width={size === 'sm' ? 40 : size === 'md' ? 60 : 80} height={size === 'sm' ? 40 : size === 'md' ? 60 : 80}>
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-500 ease-out"
          />
        </svg>
        {showLabel && (
          <span className="absolute text-xs font-semibold text-[var(--text-primary)]">
            {Math.round(percentage)}%
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-[var(--text-muted)] mt-1 block text-right">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}

// Skeleton loader with shimmer effect
interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  className?: string;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  className = '',
  animation = 'wave'
}: SkeletonProps) {
  const baseClasses = 'bg-[var(--bg-tertiary)]';

  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'relative overflow-hidden',
    none: '',
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={{
        width: width ?? (variant === 'text' ? '100%' : undefined),
        height: height ?? (variant === 'circular' ? '40px' : undefined),
      }}
    >
      {animation === 'wave' && (
        <div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          style={{ animation: 'shimmer 1.5s infinite' }}
        />
      )}
    </div>
  );
}
