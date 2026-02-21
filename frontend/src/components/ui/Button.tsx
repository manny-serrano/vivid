import { type ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  children: React.ReactNode;
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  const base = 'rounded-xl px-6 py-3 font-semibold transition-all duration-200 disabled:opacity-50';
  const variants = {
    primary: 'bg-primary hover:bg-primary-400 text-white',
    secondary: 'border border-slate-600 hover:border-slate-400 text-text-primary',
    ghost: 'text-text-secondary hover:text-text-primary',
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
