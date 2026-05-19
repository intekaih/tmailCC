'use client';

import React from 'react';

interface JapaneseWaveProps {
  className?: string;
  opacity?: number;
}

export default function JapaneseWave({ className = '', opacity = 0.22 }: JapaneseWaveProps) {
  return (
    <svg
      viewBox="0 0 1200 800"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full h-full pointer-events-none select-none transition-all duration-300 ${className}`}
      preserveAspectRatio="xMidYMax slice"
      style={{ opacity }}
    >
      {/* DISTANT WAVE OUTLINES */}
      <path
        d="M 100 680 C 300 620, 500 600, 700 660 C 900 720, 1050 710, 1200 660"
        stroke="var(--border-light)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="4 4"
      />
      <path
        d="M 0 710 C 200 650, 420 620, 650 670 C 880 720, 1050 670, 1200 700"
        stroke="var(--border)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* BACKGROUND MT FUJI MINIMALIST BRUSH LINE */}
      <path
        d="M 500 610 L 590 460 C 595 450, 605 450, 610 460 L 700 610"
        stroke="var(--border-light)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 570 510 C 585 515, 600 500, 615 515 C 625 505, 630 515, 635 510"
        stroke="var(--text-primary)"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* TRADITIONAL WOODCUT BOATS - MINIMAL LINE ART */}
      <g>
        {/* Boat 1 (Center Right) */}
        <path
          d="M 830 680 C 860 678, 910 685, 950 715 C 920 718, 860 702, 830 680 Z"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="var(--bg-secondary)"
        />
        <path d="M 860 675 L 860 690 M 875 680 L 875 695 M 890 685 L 890 700" stroke="var(--accent)" strokeWidth="2" />
        
        {/* Boat 2 (Plunging down left wave) */}
        <g transform="rotate(-12, 330, 520)">
          <path
            d="M 280 500 C 320 505, 375 525, 415 565 C 375 560, 320 530, 280 500 Z"
            stroke="var(--accent)"
            strokeWidth="3"
            strokeLinecap="round"
            fill="var(--bg-secondary)"
          />
          <path d="M 310 495 L 310 510 M 325 500 L 325 515 M 340 505 L 340 520" stroke="var(--accent)" strokeWidth="2" />
        </g>
      </g>

      {/* THE GREAT WAVE - BRUSH LINE ARTWORK */}
      <g>
        {/* Under Swell Wave Lines (Sweeping Sea Currents) */}
        <path
          d="M 0 800 C 150 700, 300 580, 260 420 C 220 280, 250 190, 330 170 C 410 150, 490 230, 570 330 C 650 430, 750 490, 850 530 C 950 570, 1050 630, 1200 680"
          stroke="var(--accent)"
          strokeWidth="8.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 80 800 C 200 710, 300 580, 280 460 C 260 340, 290 260, 350 200 C 410 140, 470 190, 530 270 C 600 360, 700 420, 800 460"
          stroke="var(--accent)"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 160 800 C 240 730, 320 620, 300 500 C 280 380, 310 320, 370 260 C 430 200, 470 240, 520 320"
          stroke="var(--accent-hover)"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Primary Crest Curve (Main Great Wave Ridge) */}
        <path
          d="M 0 760 C 220 690, 420 590, 310 420 C 230 300, 170 180, 220 120 C 255 70, 360 80, 440 130 C 520 180, 620 310, 710 390 C 800 470, 920 520, 1040 560"
          stroke="var(--text-primary)"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />

        {/* Traditional Woodblock Foam Claws / Water Fingers */}
        {/* Curled brush spirals and finger shapes at wave peak */}
        <g stroke="var(--text-primary)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {/* Main Peak Foam Fingers */}
          <path d="M 220 120 C 180 125, 160 150, 170 180 C 180 200, 200 200, 210 180 C 200 200, 180 230, 190 250 C 200 270, 220 260, 220 230" />
          <path d="M 260 90 C 230 90, 215 110, 220 140 C 225 160, 240 160, 245 140 C 240 160, 225 185, 235 200 C 245 210, 260 200, 260 170" />
          <path d="M 310 80 C 280 75, 265 95, 270 125 C 275 145, 290 145, 295 125 C 290 145, 275 170, 285 185 C 295 195, 310 185, 310 155" />
          <path d="M 370 90 C 340 85, 325 105, 330 135 C 335 155, 350 155, 355 135 C 350 155, 335 180, 345 195 C 355 205, 370 195, 370 165" />
          <path d="M 430 115 C 400 110, 385 130, 390 160 C 395 180, 410 180, 415 160 C 410 180, 395 205, 405 220 C 415 230, 430 220, 430 190" />
          
          {/* Overarching Wave Crest Cap Line */}
          <path d="M 430 125 C 470 140, 510 170, 550 220 C 590 270, 630 330, 680 380" />
          <path d="M 470 150 C 500 170, 530 200, 560 250 M 520 200 C 540 220, 560 250, 580 290" strokeWidth="2.5" />
        </g>

        {/* Flying Water Sprays / Spindrift (Clean aesthetic dots) */}
        <g fill="var(--text-primary)" opacity="0.95">
          <circle cx="150" cy="180" r="4.5" />
          <circle cx="140" cy="220" r="3.5" />
          <circle cx="155" cy="260" r="4" />
          <circle cx="165" cy="300" r="3" />
          
          <circle cx="200" cy="95" r="4" />
          <circle cx="215" cy="70" r="5" />
          <circle cx="250" cy="65" r="3.5" />
          <circle cx="280" cy="55" r="4.5" />
          <circle cx="320" cy="45" r="3" />
          <circle cx="360" cy="50" r="5" />
          <circle cx="410" cy="65" r="4" />
          
          <circle cx="470" cy="90" r="4.5" />
          <circle cx="520" cy="120" r="3.5" />
          <circle cx="570" cy="160" r="4" />
          <circle cx="620" cy="210" r="3" />
          <circle cx="660" cy="260" r="4.5" />
        </g>

        {/* Traditional wave foam bubbles at bottom left base */}
        <g stroke="var(--accent)" strokeWidth="2" fill="none" opacity="0.6">
          <circle cx="50" cy="720" r="8" />
          <circle cx="70" cy="740" r="12" />
          <circle cx="65" cy="710" r="6" />
          <circle cx="90" cy="735" r="10" />
          <circle cx="110" cy="750" r="7" />
          <circle cx="130" cy="740" r="14" />
          <circle cx="150" cy="760" r="8" />
        </g>
      </g>
    </svg>
  );
}
