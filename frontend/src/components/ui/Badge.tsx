interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const classes = {
    default: 'bg-bg-elevated text-text-secondary',
    success: 'bg-success/20 text-success',
    warning: 'bg-warning/20 text-warning',
    danger: 'bg-danger/20 text-danger',
  };
  return (
    <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-sm font-medium ${classes[variant]}`}>
      {children}
    </span>
  );
}
