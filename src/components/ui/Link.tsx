import Link from 'next/link';

export default function UiLink({
  href,
  children,
  className = ''
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={`text-blue-400 hover:text-blue-300 transition-colors ${className}`}>
      {children}
    </Link>
  );
}
