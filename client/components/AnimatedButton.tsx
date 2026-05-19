'use client';

import { useState, ButtonHTMLAttributes, forwardRef } from 'react';

interface AnimatedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'glow' | 'magnetic' | 'shimmer' | 'ripple' | 'bounce';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
}

const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ variant = 'default', size = 'md', children, className = '', onClick, ...props }, ref) => {
    const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);
    const [isHovered, setIsHovered] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base'
    };

    const handleRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
      const button = e.currentTarget;
      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = Date.now();
      
      setRipples(prev => [...prev, { x, y, id }]);
      
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== id));
      }, 600);

      onClick?.();
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (variant !== 'magnetic') return;
      const button = e.currentTarget;
      const rect = button.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) * 0.2;
      const y = (e.clientY - rect.top - rect.height / 2) * 0.2;
      setMousePos({ x, y });
    };

    const handleMouseLeave = () => {
      setIsHovered(false);
      setMousePos({ x: 0, y: 0 });
    };

    const baseClasses = `
      relative inline-flex items-center justify-center gap-2
      font-medium rounded-lg border-none cursor-pointer
      transition-all duration-200 ease-out
      disabled:opacity-50 disabled:cursor-not-allowed
      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
      focus-visible:ring-[var(--accent)] focus-visible:ring-offset-[var(--bg-primary)]
      ${sizeClasses[size]}
    `;

    const variantClasses = {
      default: `
        bg-[var(--accent)] text-white
        hover:bg-[var(--accent-hover)] hover:shadow-lg hover:shadow-[var(--accent)]/25
        active:scale-[0.98]
      `,
      glow: `
        bg-[var(--accent)] text-white
        hover:shadow-[0_0_20px_rgba(99,102,241,0.5),0_0_40px_rgba(99,102,241,0.3)]
        active:scale-[0.98]
        ${isHovered ? 'shadow-[0_0_20px_rgba(99,102,241,0.4)]' : ''}
      `,
      magnetic: `
        bg-[var(--accent)] text-white
        active:scale-[0.95]
      `,
      shimmer: `
        bg-[var(--accent)] text-white overflow-hidden
        before:absolute before:inset-0
        before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent
        before:-translate-x-full
        hover:before:animate-[shimmer_1.5s_infinite]
        active:scale-[0.98]
      `,
      ripple: `
        bg-[var(--accent)] text-white overflow-hidden
        active:scale-[0.98]
      `,
      bounce: `
        bg-[var(--accent)] text-white
        hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[var(--accent)]/25
        active:-translate-y-0
        active:scale-[0.98]
        transition-all duration-200 ease-out
      `
    };

    const magneticStyle = variant === 'magnetic' ? {
      transform: `translate(${mousePos.x}px, ${mousePos.y}px)`
    } : {};

    return (
      <button
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        onClick={variant === 'ripple' ? handleRipple : onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        style={magneticStyle}
        {...props}
      >
        {variant === 'shimmer' && (
          <span className="absolute inset-0 overflow-hidden rounded-lg">
            <span className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-[20deg]" />
          </span>
        )}

        {variant === 'ripple' && ripples.map(ripple => (
          <span
            key={ripple.id}
            className="absolute rounded-full bg-white/30 animate-[ripple_0.6s_linear]"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: 0,
              height: 0,
              marginLeft: 0,
              marginTop: 0,
              transform: 'translate(-50%, -50%)'
            }}
          />
        ))}

        <span className="relative z-10 flex items-center gap-2">
          {children}
        </span>

        <style jsx>{`
          @keyframes shimmer {
            100% {
              transform: translateX(200%);
            }
          }
          @keyframes ripple {
            to {
              width: 300px;
              height: 300px;
              margin-left: -150px;
              margin-top: -150px;
              opacity: 0;
            }
          }
        `}</style>
      </button>
    );
  }
);

AnimatedButton.displayName = 'AnimatedButton';

export default AnimatedButton;

// Secondary/Ghost variant wrapper
export function AnimatedButtonSecondary({ 
  children, 
  size = 'md',
  className = '',
  ...props 
}: Omit<AnimatedButtonProps, 'variant'>) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <AnimatedButton
      variant="default"
      className={`
        bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border)]
        hover:bg-[var(--bg-hover)] hover:border-[var(--accent)]/50
        active:scale-[0.98]
        ${sizeClasses[size]} ${className}
      `}
      {...props}
    >
      {children}
    </AnimatedButton>
  );
}
