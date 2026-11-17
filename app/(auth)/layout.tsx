import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";

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
        <BrandLogo className="h-12" />
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
