'use client';

import { useEffect, useRef } from 'react';

const SOUND_URL = '/notification.mp3';

interface NotificationSoundProps {
  play: boolean;
  onDone: () => void;
}

export default function NotificationSound({ play, onDone }: NotificationSoundProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(SOUND_URL);
      audioRef.current.volume = 0.4;
    }
  }, []);

  useEffect(() => {
    if (play && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      setTimeout(() => onDone(), 500);
    }
  }, [play, onDone]);

  return null;
}
