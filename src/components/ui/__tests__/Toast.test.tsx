import { describe, it, expect, vi, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "@/components/ui/Toast";

function Trigger() {
  const toast = useToast();
  return (
    <>
      <button onClick={() => toast.success("Saved")}>ok</button>
      <button onClick={() => toast.error("Nope")}>fail</button>
    </>
  );
}

const setup = () =>
  render(
    <ToastProvider>
      <Trigger />
    </ToastProvider>
  );

afterEach(() => vi.useRealTimers());

describe("ToastProvider", () => {
  it("shows success as a status and errors as an alert", async () => {
    setup();
    await userEvent.click(screen.getByText("ok"));
    await userEvent.click(screen.getByText("fail"));
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    expect(screen.getByRole("alert")).toHaveTextContent("Nope");
  });

  it("closes a toast from its dismiss button", async () => {
    setup();
    await userEvent.click(screen.getByText("fail"));
    await userEvent.click(screen.getByLabelText("Dismiss"));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("dismisses itself after a few seconds", () => {
    vi.useFakeTimers();
    setup();
    act(() => screen.getByText("ok").click());
    expect(screen.getByRole("status")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("throws outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Trigger />)).toThrow(/ToastProvider/);
  });
});
