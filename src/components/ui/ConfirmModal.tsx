"use client";

import Modal from "@/components/ui/Modal";
import Button, { type ButtonVariant } from "@/components/ui/Button";

type ConfirmModalProps = {
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  busyLabel: string;
  variant?: ButtonVariant;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  title,
  children,
  confirmLabel,
  busyLabel,
  variant = "danger",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  // Escape is ignored mid-write so the modal can't vanish under a running action.
  const close = () => { if (!busy) onCancel(); };

  return (
    <Modal onClose={close} title={title}>
      <p className="text-sm mb-6 text-muted">{children}</p>
      <div className="flex gap-3">
        <Button variant="ghost" onClick={onCancel} disabled={busy} className="flex-1">
          Cancel
        </Button>
        <Button variant={variant} onClick={onConfirm} loading={busy} loadingText={busyLabel} className="flex-1">
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
