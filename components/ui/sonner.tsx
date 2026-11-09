"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster({ ...props }: ToasterProps) {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme === "light" || theme === "dark" ? theme : "system"}
      position="top-center"
      richColors
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-5" strokeWidth={2.5} />,
        info: <InfoIcon className="size-5" strokeWidth={2.5} />,
        warning: <TriangleAlertIcon className="size-5" strokeWidth={2.5} />,
        error: <OctagonXIcon className="size-5" strokeWidth={2.5} />,
        loading: <Loader2Icon className="size-5 animate-spin" strokeWidth={2.5} />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--success-bg": "var(--status-success-surface)",
          "--success-border": "var(--status-success-border)",
          "--success-text": "var(--status-success-foreground)",
          "--info-bg": "var(--status-info-surface)",
          "--info-border": "var(--status-info-border)",
          "--info-text": "var(--status-info-foreground)",
          "--warning-bg": "var(--status-warning-surface)",
          "--warning-border": "var(--status-warning-border)",
          "--warning-text": "var(--status-warning-foreground)",
          "--error-bg": "var(--status-error-surface)",
          "--error-border": "var(--status-error-border)",
          "--error-text": "var(--status-error-foreground)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast !gap-3 !border-2 !px-4 !py-3.5 !text-sm !shadow-lg",
          icon: "!size-5",
        },
      }}
      {...props}
    />
  );
}
