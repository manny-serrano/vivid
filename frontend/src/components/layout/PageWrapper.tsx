interface PageWrapperProps {
  children: React.ReactNode;
  title?: string;
}

export function PageWrapper({ children, title }: PageWrapperProps) {
  return (
    <div className="min-h-screen">
      {title && <h1 className="text-2xl font-semibold mb-6">{title}</h1>}
      {children}
    </div>
  );
}
