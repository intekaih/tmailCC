'use client';

import { useEffect, useRef } from 'react';
import JapaneseWave from './JapaneseWave';

interface AnimatedBackgroundProps {
  variant?: 'particles' | 'gradient' | 'mesh';
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
}

export default function AnimatedBackground({
  variant = 'gradient',
  intensity = 'low',
  className = ''
}: AnimatedBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (variant !== 'particles' || typeof window === 'undefined') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const particles: Particle[] = [];
    const particleCount = intensity === 'high' ? 80 : intensity === 'medium' ? 50 : 30;

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
      color: string;

      constructor(canvasWidth: number, canvasHeight: number) {
        this.x = Math.random() * canvasWidth;
        this.y = Math.random() * canvasHeight;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * 2 + 1;
        this.opacity = Math.random() * 0.5 + 0.1;
        this.color = this.getRandomColor();
      }

      getRandomColor() {
        const colors = [
          '99, 102, 241',   // indigo (accent)
          '139, 92, 246',   // purple
          '168, 85, 247',  // violet
          '79, 70, 229',   // blue
        ];
        return colors[Math.floor(Math.random() * colors.length)];
      }

      update(width: number, height: number) {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color}, ${this.opacity})`;
        ctx.fill();
      }
    }

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const init = () => {
      resize();
      particles.length = 0;
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle(canvas.width, canvas.height));
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(particle => {
        particle.update(canvas.width, canvas.height);
        particle.draw(ctx);
      });

      // Draw connections
      particles.forEach((p1, i) => {
        particles.slice(i + 1).forEach(p2 => {
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.1 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      animationId = requestAnimationFrame(animate);
    };

    init();
    animate();

    window.addEventListener('resize', () => {
      resize();
    });

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, [variant, intensity]);

  const intensityStyles = {
    low: 'opacity-[0.1]',
    medium: 'opacity-[0.18]',
    high: 'opacity-[0.25]'
  };

  if (variant === 'particles') {
    return (
      <div className={`fixed inset-0 pointer-events-none z-[-1] overflow-hidden ${className}`}>
        {/* Soft Parchment backing */}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-secondary)] to-[var(--bg-primary)] opacity-80" />
        
        {/* Calligraphy brush strokes overlay */}
        <svg className="absolute top-[20%] left-[-10%] w-[120%] h-[60%] opacity-[0.03] text-[var(--accent)]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 400">
          <path d="M50 200 C300 50, 700 350, 950 200" fill="none" stroke="currentColor" strokeWidth="32" strokeLinecap="round" />
          <path d="M100 150 C350 200, 600 100, 900 250" fill="none" stroke="currentColor" strokeWidth="18" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (variant === 'gradient') {
    return (
      <div className={`fixed inset-0 pointer-events-none z-[-1] overflow-hidden ${className}`}>
        {/* Ambient sky overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-secondary)] via-[var(--bg-primary)] to-[var(--bg-primary)] opacity-70" />
        
        {/* Traditional Woodblock Sun (rising disc) */}
        <div className="absolute top-[12%] right-[10%] w-[150px] h-[150px] md:w-[220px] md:h-[220px] rounded-full bg-[var(--error)] opacity-[0.05] dark:opacity-[0.08] blur-[1px]" />

        {/* Detailed High-Fidelity SVG Great Wave watermark */}
        <div className="absolute inset-0 opacity-[0.13] dark:opacity-[0.08] z-0">
          <JapaneseWave />
        </div>

        {/* Dynamic Sea Waves at bottom */}
        <div className={`absolute bottom-0 left-0 w-full h-[35%] min-h-[220px] overflow-hidden ${intensityStyles[intensity]}`}>
          {/* Wave Layer 1 - Deep ocean current */}
          <div className="absolute bottom-[-10px] left-0 w-[200%] h-full animate-[seaWave_18s_linear_infinite]" style={{ transform: 'translateX(0)' }}>
            <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full fill-[var(--accent)] opacity-40">
              <path d="M0,60 C150,95 350,25 500,60 C650,95 850,25 1000,60 C1150,95 1350,25 1500,60 L1500,120 L0,120 Z" />
            </svg>
          </div>
          
          {/* Wave Layer 2 - Wooden gold highlight */}
          <div className="absolute bottom-[-20px] left-0 w-[200%] h-full animate-[seaWave_24s_linear_infinite_reverse]" style={{ transform: 'translateX(0)', animationDelay: '-4s' }}>
            <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full fill-[var(--star-color)] opacity-30">
              <path d="M0,50 C200,85 400,15 600,50 C800,85 1000,15 1200,50 C1400,85 1600,15 1800,50 L1800,120 L0,120 Z" />
            </svg>
          </div>
          
          {/* Wave Layer 3 - Foam crests */}
          <div className="absolute bottom-[-30px] left-0 w-[200%] h-full animate-[seaWave_12s_linear_infinite]" style={{ transform: 'translateX(0)', animationDelay: '-1.5s' }}>
            <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full fill-[var(--text-primary)] opacity-[0.16]">
              <path d="M0,70 C100,88 200,52 300,70 C400,88 500,52 600,70 C700,88 800,52 900,70 C1000,88 1100,52 1200,70 L1200,120 L0,120 Z" />
            </svg>
          </div>
        </div>

        <style jsx>{`
          @keyframes seaWave {
            0% { transform: translateX(0); }
            50% { transform: translateX(-25%); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
      </div>
    );
  }

  if (variant === 'mesh') {
    return (
      <div className={`fixed inset-0 pointer-events-none z-[-1] overflow-hidden ${className}`}>
        {/* Full screen Seigaiha Pattern backdrop */}
        <div className="absolute inset-0 opacity-[0.06] dark:opacity-[0.04]" 
             style={{ 
               backgroundImage: 'var(--wave-pattern)', 
               backgroundSize: '120px 60px' 
             }} />
        
        {/* Gentle spotlight glow */}
        <div className="absolute top-[30%] left-[20%] w-[300px] h-[300px] rounded-full bg-[var(--accent)] opacity-[0.04] blur-[80px]" />
      </div>
    );
  }

  return null;
}
