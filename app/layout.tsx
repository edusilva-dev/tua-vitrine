import type { Metadata } from "next";
import { Geist_Mono, Inter, Montserrat } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

const montserratHeading = Montserrat({ subsets: ["latin"], variable: "--font-heading" });

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "tua vitrine · Seu negócio mais perto",
  description:
    "Sua loja online, simples e do seu jeito. Catálogo de produtos e atendimento pelo WhatsApp.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        inter.variable,
        montserratHeading.variable
      )}
    >
      <body>
        <ThemeProvider defaultTheme="light">
          <Toaster />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
