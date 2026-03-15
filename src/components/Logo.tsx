import React from 'react';

export const VisionFlowLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 120 60" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="logoGradDark" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#003b8e" />
        <stop offset="100%" stopColor="#005ea3" />
      </linearGradient>
      <linearGradient id="logoGradLight" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#0072b5" />
        <stop offset="100%" stopColor="#00b4d8" />
      </linearGradient>
      <linearGradient id="logoGradIris" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#005ea3" />
        <stop offset="100%" stopColor="#00b4d8" />
      </linearGradient>
    </defs>
    
    {/* Dark blue bottom curve looping into circle */}
    <path 
      d="M 10 30 C 25 55, 60 60, 80 40 C 95 25, 90 5, 70 5 C 50 5, 40 20, 40 35 C 40 50, 55 55, 70 55" 
      fill="none" 
      stroke="url(#logoGradDark)" 
      strokeWidth="8" 
      strokeLinecap="round" 
    />
    
    {/* Light blue top curve sweeping right */}
    <path 
      d="M 10 30 C 25 5, 60 0, 80 20 C 95 35, 100 45, 115 35" 
      fill="none" 
      stroke="url(#logoGradLight)" 
      strokeWidth="8" 
      strokeLinecap="round" 
    />
    
    {/* Iris */}
    <circle cx="60" cy="30" r="12" fill="url(#logoGradIris)" />
    <circle cx="64" cy="26" r="3.5" fill="white" />
  </svg>
);
