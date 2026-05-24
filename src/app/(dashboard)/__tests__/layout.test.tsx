import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardLayout from "@/app/(dashboard)/layout";
import { useAuth } from "@/hooks/useAuth";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({ id: "test-league-id" }),
  usePathname: () => "/",
}));

vi.mock("@/hooks/useAuth");
vi.mock("firebase/auth", () => ({ signOut: vi.fn() }));
vi.mock("@/lib/firebase", () => ({ auth: {}, db: {} }));

beforeEach(() => vi.clearAllMocks());

describe("DashboardLayout", () => {
  it("shows spinner while loading", () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: true });
    const { container } = render(
      <DashboardLayout>
        <p>Protected content</p>
      </DashboardLayout>
    );
    expect(screen.queryByText("Protected content")).toBeNull();
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("redirects to /login when unauthenticated", () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false });
    render(
      <DashboardLayout>
        <p>Protected content</p>
      </DashboardLayout>
    );
    expect(mockPush).toHaveBeenCalledWith("/login");
    expect(screen.queryByText("Protected content")).toBeNull();
  });

  it("renders children when authenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { displayName: "Alice", uid: "u1" } as never,
      loading: false,
    });
    render(
      <DashboardLayout>
        <p>Protected content</p>
      </DashboardLayout>
    );
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("renders the user display name in the nav when authenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { displayName: "Alice", uid: "u1" } as never,
      loading: false,
    });
    render(
      <DashboardLayout>
        <p>content</p>
      </DashboardLayout>
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("renders Sign out button when authenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { displayName: "Alice", uid: "u1" } as never,
      loading: false,
    });
    render(
      <DashboardLayout>
        <p>content</p>
      </DashboardLayout>
    );
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });
});
