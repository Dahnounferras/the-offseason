import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfirmModal from "@/components/ui/ConfirmModal";

function renderModal(props: Partial<React.ComponentProps<typeof ConfirmModal>> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmModal
      title="Delete team?"
      confirmLabel="Delete"
      busyLabel="Deleting…"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    >
      This cannot be undone.
    </ConfirmModal>
  );
  return { onConfirm, onCancel };
}

describe("ConfirmModal", () => {
  it("renders an accessible dialog with title and body", () => {
    renderModal();
    expect(screen.getByRole("dialog", { name: "Delete team?" })).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
  });

  it("calls onConfirm and onCancel from the buttons", async () => {
    const user = userEvent.setup();
    const { onConfirm, onCancel } = renderModal();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("cancels on Escape", async () => {
    const user = userEvent.setup();
    const { onCancel } = renderModal();
    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("disables both buttons and ignores Escape while busy", async () => {
    const user = userEvent.setup();
    const { onCancel } = renderModal({ busy: true });
    expect(screen.getByRole("button", { name: /Deleting…/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    await user.keyboard("{Escape}");
    expect(onCancel).not.toHaveBeenCalled();
  });
});
