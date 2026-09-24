import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-12">
      <Link
        href="/entrar"
        className="mb-8 font-heading text-2xl font-bold tracking-tight text-primary"
      >
        tua vitrine<span className="text-muted-foreground">.</span>
      </Link>
      <div className="w-full max-w-md">{children}</div>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Seu negócio mais perto de quem compra.
      </p>
    </main>
  );
}
