import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { onAuthStateChanged } from "firebase/auth";
import { useAuth } from "@/hooks/useAuth";

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({ auth: {}, db: {} }));

beforeEach(() => vi.clearAllMocks());

describe("useAuth", () => {
  it("starts with loading=true and user=null", () => {
    vi.mocked(onAuthStateChanged).mockImplementation(() => () => {});
    const { result } = renderHook(() => useAuth());
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it("sets user and clears loading when Firebase resolves a user", () => {
    const fakeUser = { uid: "u1", email: "test@test.com", displayName: "Tester" };
    vi.mocked(onAuthStateChanged).mockImplementation((_auth, cb) => {
      (cb as (u: unknown) => void)(fakeUser);
      return () => {};
    });
    const { result } = renderHook(() => useAuth());
    expect(result.current.user).toEqual(fakeUser);
    expect(result.current.loading).toBe(false);
  });

  it("sets user=null and clears loading when Firebase resolves null", () => {
    vi.mocked(onAuthStateChanged).mockImplementation((_auth, cb) => {
      (cb as (u: unknown) => void)(null);
      return () => {};
    });
    const { result } = renderHook(() => useAuth());
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("calls the unsubscribe function on unmount", () => {
    const unsubscribe = vi.fn();
    vi.mocked(onAuthStateChanged).mockImplementation(() => unsubscribe);
    const { unmount } = renderHook(() => useAuth());
    unmount();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
