"use client";

import { useEffect, useId } from "react";

type ModalProps = {
  onClose: () => void;
  size?: "sm" | "md";
  // Panel padding and layout; roster-style modals pass their own.
  className?: string;
  title?: string;
  children: React.ReactNode;
};

export default function Modal({ onClose, size = "sm", className = "p-6", title, children }: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={`w-full ${size === "sm" ? "max-w-sm" : "max-w-md"} rounded-2xl bg-surface border border-border ${className}`}
      >
        {title && <h2 id={titleId} className="text-lg font-bold mb-2">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
