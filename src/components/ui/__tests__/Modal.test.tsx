import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Modal from "@/components/ui/Modal";

function Harness({ onClose = () => {} }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  const close = () => {
    onClose();
    setOpen(false);
  };
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      {open && (
        <Modal title="Edit" onClose={close}>
          <input aria-label="Name" />
          <button>Save</button>
        </Modal>
      )}
    </>
  );
}

describe("Modal", () => {
  it("focuses the first control when it opens", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByText("Open"));
    expect(screen.getByRole("dialog", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveFocus();
  });

  it("keeps Tab and Shift+Tab inside the dialog", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByText("Open"));
    await userEvent.tab();
    expect(screen.getByText("Save")).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByLabelText("Name")).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(screen.getByText("Save")).toHaveFocus();
  });

  it("closes on Escape and returns focus to the opener", async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    await userEvent.click(screen.getByText("Open"));
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Open")).toHaveFocus();
  });

  it("closes on a backdrop click but not a click inside the panel", async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    await userEvent.click(screen.getByText("Open"));
    await userEvent.click(screen.getByLabelText("Name"));
    expect(onClose).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("dialog").parentElement!);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
