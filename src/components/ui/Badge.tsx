import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'error' | 'warning';
}

export default function Badge({ children, variant = 'primary' }: BadgeProps) {
  const variantStyles = {
    primary: 'bg-blue-900/30 text-blue-300',
    success: 'bg-green-900/30 text-green-300',
    error: 'bg-red-900/30 text-red-300',
    warning: 'bg-yellow-900/30 text-yellow-300',
  };

  return (
    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${variantStyles[variant]}`}>
      {children}
    </span>
  );
}
