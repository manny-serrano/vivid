export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div
      className={`inline-block h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-accent ${className}`}
      role="status"
    />
  );
}
