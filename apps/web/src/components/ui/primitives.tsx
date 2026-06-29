"use client";

import { cn } from "@agenthub/ui";
import { X } from "lucide-react";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

export function Button({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 border border-white/15 px-4 text-sm font-semibold transition hover:border-[var(--signal)] hover:text-[var(--signal)] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("border border-white/10 bg-[#0d1110]/90 p-5", className)}
      {...props}
    />
  );
}

export function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4"
      role="presentation"
    >
      <section
        aria-modal="true"
        className="w-full max-w-lg border border-white/15 bg-[#0b0f0e] p-6"
        role="dialog"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">{title}</h2>
          <Button
            aria-label="Close modal"
            className="size-9 min-h-0 p-0"
            onClick={onClose}
          >
            <X size={16} />
          </Button>
        </div>
        <div className="mt-5">{children}</div>
      </section>
    </div>
  );
}

export function Drawer({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <aside
      aria-hidden={!open}
      className={cn(
        "fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-white/10 bg-[#0b0f0e] p-6 transition-transform",
        open ? "translate-x-0" : "translate-x-full",
      )}
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">{title}</h2>
        <Button
          aria-label="Close drawer"
          className="size-9 min-h-0 p-0"
          onClick={onClose}
        >
          <X size={16} />
        </Button>
      </div>
      <div className="mt-6">{children}</div>
    </aside>
  );
}
