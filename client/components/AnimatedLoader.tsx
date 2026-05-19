'use client';

import { useEffect, useState } from 'react';

// ============ SPINNER VARIANTS ============

// Classic rotating spinner
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  className?: string;
}

export function Spinner({ size = 'md', color = 'var(--accent)', className = '' }: SpinnerProps) {
  const sizeMap = {
    sm: 16,
    md: 24,
    lg: 32,
    xl: 48,
  };

  const pixelSize = sizeMap[size];

  return (
    <svg
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-spin ${className}`}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="var(--border)"
        strokeWidth="3"
      />
      <path
        d="M12 2a10 10 0 019.3 6"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Dots bouncing animation
export function DotsBounce({ size = 'md', className = '' }: SpinnerProps) {
  const dotSizes = { sm: 6, md: 8, lg: 10, xl: 14 };
  const dotSize = dotSizes[size];

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-full bg-[var(--accent)]"
          style={{
            width: dotSize,
            height: dotSize,
            animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite both`,
          }}
        />
      ))}
    </div>
  );
}

// Pulse animation
export function Pulse({ size = 'md', className = '' }: SpinnerProps) {
  const sizeMap = { sm: 16, md: 24, lg: 32, xl: 48 };
  const pixelSize = sizeMap[size] || 24;

  return (
    <div className={`relative ${className}`} style={{ width: pixelSize, height: pixelSize }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute inset-0 rounded-full bg-[var(--accent)]"
          style={{
            animation: `pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) ${i * 0.5}s infinite`,
            opacity: 0,
          }}
        />
      ))}
      <div className="absolute inset-0 rounded-full bg-[var(--accent)]" />
    </div>
  );
}

// Skeleton block with shimmer
interface SkeletonBlockProps {
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  className?: string;
}

export function SkeletonBlock({ 
  width = '100%', 
  height = 16, 
  rounded = false,
  className = '' 
}: SkeletonBlockProps) {
  return (
    <div
      className={`bg-[var(--bg-tertiary)] overflow-hidden ${rounded ? 'rounded-full' : 'rounded'} ${className}`}
      style={{ width, height }}
    >
      <div 
        className="w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
        style={{ animation: 'shimmer 1.5s infinite' }}
      />
    </div>
  );
}

// Email skeleton
interface EmailSkeletonProps {
  count?: number;
  className?: string;
}

export function EmailSkeleton({ count = 3, className = '' }: EmailSkeletonProps) {
  return (
    <div className={`space-y-3 p-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-xl">
          {/* Avatar skeleton */}
          <SkeletonBlock width={36} height={36} rounded className="flex-shrink-0" />
          
          {/* Content skeleton */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <SkeletonBlock width="40%" height={14} />
              <SkeletonBlock width={60} height={12} />
            </div>
            <SkeletonBlock width="70%" height={13} />
            <SkeletonBlock width="90%" height={12} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Full page loading overlay
interface LoadingOverlayProps {
  message?: string;
  variant?: 'spinner' | 'dots' | 'progress';
  progress?: number;
  className?: string;
}

export function LoadingOverlay({ 
  message,
  variant = 'spinner',
  progress,
  className = '' 
}: LoadingOverlayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-primary)]/80 backdrop-blur-sm">
      <div className={`flex flex-col items-center gap-4 ${className}`}>
        {variant === 'spinner' && <Spinner size="lg" />}
        {variant === 'dots' && <DotsBounce size="lg" />}
        
        {variant === 'progress' && (
          <div className="w-48">
            <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[var(--accent)] rounded-full transition-all duration-300"
                style={{ width: `${progress ?? 0}%` }}
              />
            </div>
          </div>
        )}
        
        {message && (
          <p className="text-sm text-[var(--text-secondary)] animate-pulse">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

// Glitch loading text
export function GlitchText({ text = 'Loading...', className = '' }: { text?: string; className?: string }) {
  const [displayText, setDisplayText] = useState(text);

  useEffect(() => {
    const chars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
    let interval: NodeJS.Timeout;
    let iterations = 0;

    interval = setInterval(() => {
      setDisplayText(
        text.split('').map((char, index) => {
          if (index < iterations / 4) {
            return text[index];
          }
          return chars[Math.floor(Math.random() * chars.length)];
        }).join('')
      );

      iterations++;
      if (iterations > text.length * 4) {
        setDisplayText(text);
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [text]);

  return <span className={`font-mono ${className}`}>{displayText}</span>;
}

// Progress bar with percentage
interface ProgressBarProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ProgressBar({ 
  value, 
  max = 100, 
  showLabel = false, 
  size = 'md',
  className = '' 
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const heights = { sm: 'h-1', md: 'h-2', lg: 'h-3' };

  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden ${heights[size]}`}>
        <div
          className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1 text-xs text-[var(--text-muted)]">
          <span>{value} / {max}</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
    </div>
  );
}

// Ring loader (like Apple Watch)
export function RingLoader({ size = 'md', className = '' }: SpinnerProps) {
  const sizeMap = { sm: 24, md: 48, lg: 72, xl: 96 };
  const pixelSize = sizeMap[size] || 24;
  
  return (
    <svg
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 50 50"
      className={`transform -rotate-90 ${className}`}
    >
      <circle
        cx="25"
        cy="25"
        r="20"
        fill="none"
        stroke="var(--bg-tertiary)"
        strokeWidth="4"
      />
      <circle
        cx="25"
        cy="25"
        r="20"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="126"
        strokeDashoffset="94"
        className="animate-[dash_1.5s_ease-in-out_infinite]"
      />
    </svg>
  );
}

// Infinity loader
export function InfinityLoader({ size = 'md', className = '' }: SpinnerProps) {
  const sizeMap = { sm: 12, md: 24, lg: 36, xl: 48 };
  const pixelSize = sizeMap[size] || 24;
  
  return (
    <svg
      width={pixelSize * 2}
      height={pixelSize}
      viewBox="0 0 100 50"
      className={className}
    >
      <path
        fill="none"
        stroke="var(--accent)"
        strokeWidth="4"
        strokeLinecap="round"
        d="M0 25 Q 12.5 0, 25 25 T 50 25 T 75 25 T 100 25"
        className="animate-[infinity_2s_linear_infinite]"
      />
    </svg>
  );
}

// Blob loader (morphing shape)
export function BlobLoader({ size = 'md', className = '' }: SpinnerProps) {
  const sizeMap = { sm: 16, md: 24, lg: 32, xl: 48 };
  const pixelSize = sizeMap[size] || 24;
  
  return (
    <div 
      className={`${className}`}
      style={{ width: pixelSize, height: pixelSize }}
    >
      <div 
        className="w-full h-full rounded-full bg-[var(--accent)]"
        style={{
          animation: 'blob 2s ease-in-out infinite',
        }}
      />
    </div>
  );
}

// Typing indicator (3 dots)
export function TypingIndicator({ size = 'sm', className = '' }: SpinnerProps) {
  const dotSizes = { sm: 4, md: 6, lg: 8, xl: 10 };
  const dotSize = dotSizes[size];

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-full bg-[var(--text-muted)]"
          style={{
            width: dotSize,
            height: dotSize,
            animation: `typing 1.4s ease-in-out infinite`,
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </div>
  );
}

// Add CSS keyframes
export const LoadingKeyframes = () => (
  <style jsx global>{`
    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }

    @keyframes pulse-ring {
      0% { transform: scale(0.8); opacity: 0.5; }
      50% { opacity: 0.3; }
      100% { transform: scale(1.5); opacity: 0; }
    }

    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(200%); }
    }

    @keyframes dash {
      0% { stroke-dashoffset: 126; }
      50% { stroke-dashoffset: 31.5; }
      100% { stroke-dashoffset: 126; stroke-dasharray: 31.5; }
    }

    @keyframes infinity {
      0% { d: path("M0 25 Q 12.5 0, 25 25 T 50 25 T 75 25 T 100 25"); }
      50% { d: path("M0 25 Q 12.5 50, 25 25 T 50 25 T 75 25 T 100 25"); }
      100% { d: path("M0 25 Q 12.5 0, 25 25 T 50 25 T 75 25 T 100 25"); }
    }

    @keyframes blob {
      0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
      50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
    }

    @keyframes typing {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-6px); }
    }
  `}</style>
);
