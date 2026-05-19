'use client';

import { useState, useEffect, useCallback } from 'react';

interface AnimatedTextProps {
  text: string;
  variant?: 'typewriter' | 'scramble' | 'fade' | 'wave' | 'glitch';
  speed?: number;
  className?: string;
  loop?: boolean;
  delay?: number;
}

// Typewriter effect
function TypewriterText({ text, speed = 50, className = '' }: Omit<AnimatedTextProps, 'variant'>) {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayText('');
    setIsComplete(false);
    
    let index = 0;
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;
      } else {
        setIsComplete(true);
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);

  return <span className={className}>{displayText}<span className="animate-pulse">|</span></span>;
}

// Scramble effect
function ScrambleText({ text, speed = 30, className = '' }: Omit<AnimatedTextProps, 'variant'>) {
  const [displayText, setDisplayText] = useState(text);
  const [isScrambling, setIsScrambling] = useState(true);

  useEffect(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let iterations = 0;
    const maxIterations = text.length * 3;

    const interval = setInterval(() => {
      setDisplayText(
        text.split('').map((char, index) => {
          if (index < iterations / 3) return char;
          return chars[Math.floor(Math.random() * chars.length)];
        }).join('')
      );

      iterations++;
      if (iterations >= maxIterations) {
        setDisplayText(text);
        setIsScrambling(false);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return <span className={className} style={{ fontFamily: 'monospace' }}>{displayText}</span>;
}

// Fade in effect
function FadeText({ text, className = '' }: Omit<AnimatedTextProps, 'variant'>) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <span 
      className={className}
      style={{ 
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.6s ease-out'
      }}
    >
      {text}
    </span>
  );
}

// Wave effect - each character animates with delay
function WaveText({ text, className = '' }: Omit<AnimatedTextProps, 'variant'>) {
  return (
    <span className={`inline-flex ${className}`}>
      {text.split('').map((char, index) => (
        <span
          key={index}
          className="animate-bounce"
          style={{ 
            animationDuration: '0.6s',
            animationDelay: `${index * 50}ms`,
            animationFillMode: 'both'
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
}

// Glitch effect
function GlitchText({ text, className = '' }: Omit<AnimatedTextProps, 'variant'>) {
  const [isGlitching, setIsGlitching] = useState(false);

  useEffect(() => {
    const glitchInterval = setInterval(() => {
      setIsGlitching(true);
      setTimeout(() => setIsGlitching(false), 150);
    }, 3000);

    return () => clearInterval(glitchInterval);
  }, []);

  return (
    <span 
      className={`${className} relative ${isGlitching ? 'animate-pulse' : ''}`}
      style={{
        textShadow: isGlitching 
          ? '2px 0 #ff0000, -2px 0 #00ffff'
          : 'none',
        animation: isGlitching ? 'none' : undefined
      }}
    >
      {text}
    </span>
  );
}

export function AnimatedText({ variant = 'fade', ...props }: AnimatedTextProps) {
  switch (variant) {
    case 'typewriter':
      return <TypewriterText {...props} />;
    case 'scramble':
      return <ScrambleText {...props} />;
    case 'wave':
      return <WaveText {...props} />;
    case 'glitch':
      return <GlitchText {...props} />;
    default:
      return <FadeText {...props} />;
  }
}

// Empty state component with animations
interface AnimatedEmptyStateProps {
  icon?: 'email' | 'search' | 'user' | 'lock' | 'error' | 'success';
  title: string;
  description?: string;
  textVariant?: AnimatedTextProps['variant'];
  action?: React.ReactNode;
  className?: string;
}

export default function AnimatedEmptyState({
  icon = 'email',
  title,
  description,
  textVariant = 'fade',
  action,
  className = ''
}: AnimatedEmptyStateProps) {
  const IconComponent = () => {
    const iconClasses = 'w-12 h-12 text-[var(--text-muted)] opacity-30';
    
    switch (icon) {
      case 'email':
        return (
          <svg className={`${iconClasses} animate-pulse`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="4" width="20" height="16" rx="3" />
            <path d="M2 7l10 6 10-6" />
          </svg>
        );
      case 'search':
        return (
          <svg className={`${iconClasses}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" className="animate-spin" style={{ animationDuration: '3s' }} />
          </svg>
        );
      case 'user':
        return (
          <svg className={`${iconClasses}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21v-2a4 4 0 014-4h8a4 4 0 014 4v2" />
          </svg>
        );
      case 'lock':
        return (
          <svg className={`${iconClasses}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        );
      case 'error':
        return (
          <svg className={`${iconClasses} text-[var(--error)]`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6M9 9l6 6" />
          </svg>
        );
      case 'success':
        return (
          <svg className={`${iconClasses} text-[var(--success)]`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <div className="mb-4 relative">
        <IconComponent />
        <div className="absolute inset-0 bg-gradient-radial from-[var(--accent)]/5 to-transparent blur-xl opacity-50" />
      </div>
      
      <AnimatedText 
        text={title} 
        variant={textVariant} 
        className="text-base font-semibold text-[var(--text-primary)] mb-2"
      />
      
      {description && (
        <AnimatedText 
          text={description} 
          variant={textVariant}
          speed={30}
          className="text-sm text-[var(--text-muted)] max-w-xs"
        />
      )}
      
      {action && (
        <div className="mt-4 animate-fade-in" style={{ animationDelay: '300ms' }}>
          {action}
        </div>
      )}
    </div>
  );
}

// Floating animation wrapper
interface FloatingContainerProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
}

export function FloatingContainer({ 
  children, 
  className = '',
  delay = 0,
  duration = 3
}: FloatingContainerProps) {
  return (
    <div 
      className={className}
      style={{
        animation: `float ${duration}s ease-in-out infinite`,
        animationDelay: `${delay}s`
      }}
    >
      {children}
    </div>
  );
}

// Pulse glow effect
interface PulseGlowProps {
  children: React.ReactNode;
  color?: string;
  className?: string;
}

export function PulseGlow({ children, color = 'var(--accent)', className = '' }: PulseGlowProps) {
  return (
    <span className={`relative inline-flex ${className}`}>
      <span 
        className="absolute inset-0 blur-md opacity-50 animate-pulse"
        style={{ backgroundColor: color }}
      />
      <span className="relative">{children}</span>
    </span>
  );
}
