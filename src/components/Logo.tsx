import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 100 100" 
    width="100%"
    height="100%"
    fill="none" 
    className={className}
  >
    <circle cx="50" cy="50" r="50" fill="#4A25E1" />
    <g transform="translate(50, 50) scale(1.15) translate(-50, -50)">
      <path d="M 21 27.5 h 15 v 5 a 15 15 0 0 1 -15 15 Z" fill="#FFFFFF" />
      <path d="M 40 27.5 h 15 v 30 a 15 15 0 0 1 -15 15 Z" fill="#FFFFFF" />
      <circle cx="69" cy="37.5" r="10" fill="#FFD24C" />
    </g>
  </svg>
);
