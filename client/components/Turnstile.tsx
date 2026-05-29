'use client';

import { useEffect, useRef, useState } from 'react';

interface TurnstileProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  theme?: 'light' | 'dark' | 'auto';
}

export default function Turnstile({ siteKey, onVerify, onExpire, onError, theme = 'auto' }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = () => setScriptLoaded(true);
      document.body.appendChild(script);
    } else {
      setScriptLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !containerRef.current) return;

    const renderWidget = () => {
      if (typeof window !== 'undefined' && (window as any).turnstile) {
        try {
          if (widgetIdRef.current) {
            (window as any).turnstile.remove(widgetIdRef.current);
          }

          const id = (window as any).turnstile.render(containerRef.current, {
            sitekey: siteKey,
            callback: (token: string) => onVerify(token),
            'expired-callback': () => onExpire?.(),
            'error-callback': () => onError?.(),
            theme: theme,
          });
          widgetIdRef.current = id;
        } catch (err) {
          console.error('Turnstile render error:', err);
        }
      } else {
        setTimeout(renderWidget, 100);
      }
    };

    renderWidget();

    return () => {
      if (widgetIdRef.current && typeof window !== 'undefined' && (window as any).turnstile) {
        try {
          (window as any).turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        } catch (err) {
          // Silent cleanup
        }
      }
    };
  }, [scriptLoaded, siteKey, onVerify, onExpire, onError, theme]);

  return <div ref={containerRef} className="my-2 flex justify-center min-h-[65px]" />;
}
