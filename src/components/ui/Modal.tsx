"use client";

import { useEffect, useId, useRef } from "react";

type ModalProps = {
  onClose: () => void;
  size?: "sm" | "md";
  // Panel padding and layout; roster-style modals pass their own.
  className?: string;
  title?: string;
  children: React.ReactNode;
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({ onClose, size = "sm", className = "p-6", title, children }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  // Read the latest onClose from the key handler without re-running the focus effect.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Focus moves into the dialog on open and back to whatever opened it on close.
  // Tab and Shift+Tab wrap around inside the panel.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const opener = document.activeElement as HTMLElement | null;
    const focusables = () => [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
    (focusables()[0] ?? panel).focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const inside = panel.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      opener?.focus?.();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
      // Pressing on the backdrop itself closes; a text selection dragged out of an input doesn't.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={`w-full ${size === "sm" ? "max-w-sm" : "max-w-md"} rounded-2xl bg-surface border border-border outline-none ${className}`}
      >
        {title && <h2 id={titleId} className="text-lg font-bold mb-2">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
