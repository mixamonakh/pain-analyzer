export default function Badge({
  children,
  variant = 'primary'
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'secondary';
}) {
  const variants = {
    primary: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    success: 'bg-green-500/20 text-green-300 border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    error: 'bg-red-500/20 text-red-300 border-red-500/30',
    secondary: 'bg-zinc-700/50 text-zinc-300 border-zinc-600/30',
  };

  return (
    <span className={`inline-flex px-2 py-1 text-xs rounded border ${variants[variant]}`}>
      {children}
    </span>
  );
}
