import type { ReactNode } from "react";

import { Logo } from "@/components/layout/Logo";

/** Centered sign-in card with the red PI logo, shared by all sign-in pages. */
export function AuthCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-muted/60 flex min-h-screen items-center justify-center px-4 py-10 ${className}`}>
      <div className="animate-page w-full max-w-[400px]">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo className="size-11 text-lg" />
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
            Pixel Infinite CRM
          </p>
        </div>
        <div className="login-form-surface bg-card shadow-glass rounded-2xl border p-6 sm:p-8">
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-muted-foreground mt-1 mb-6 text-sm">{subtitle}</p>
          {children}
        </div>
        <p className="text-muted-foreground mt-6 text-center text-xs">
          Secure sign-in · Pixel Infinite
        </p>
      </div>
    </div>
  );
}
