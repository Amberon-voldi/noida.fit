import type { ReactNode } from "react";

interface BaseCardProps {
  children: ReactNode;
  className?: string;
}

export function BaseCard({ children, className = "" }: BaseCardProps) {
  return (
    <article className={`motion-card group relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-[var(--shadow-card)] hover:border-border-strong focus-within:border-border-strong ${className}`}>
      {children}
    </article>
  );
}
