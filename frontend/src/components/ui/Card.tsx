interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`rounded-2xl bg-bg-surface border border-slate-700 p-6 ${className}`}>
      {children}
    </div>
  );
}
