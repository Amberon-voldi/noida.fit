import type { ReactNode } from "react";

interface BaseCardProps {
  children: ReactNode;
  className?: string;
}

export function BaseCard({ children, className = "" }: BaseCardProps) {
  return (
    <article className={`group relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-[var(--shadow-card)] transition-[border-color,background,transform,box-shadow] duration-200 hover:-translate-y-1 hover:border-border-strong hover:bg-surface-hover hover:shadow-[var(--shadow-card-hover)] ${className}`}>
      {children}
    </article>
  );
}
