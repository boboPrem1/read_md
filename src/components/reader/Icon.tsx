import React from 'react';

export interface IconProps {
  children: React.ReactNode;
  className?: string;
  size?: number | string;
}

export function Icon({ children, className = '', size }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      {children}
    </svg>
  );
}

export default Icon;
