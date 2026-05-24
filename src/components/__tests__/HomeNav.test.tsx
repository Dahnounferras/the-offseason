import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HomeNav from "@/components/HomeNav";
import { useAuth } from "@/hooks/useAuth";
import { signOut } from "firebase/auth";

vi.mock("@/hooks/useAuth");
vi.mock("firebase/auth", () => ({ signOut: vi.fn() }));
vi.mock("@/lib/firebase", () => ({ auth: {}, db: {} }));

beforeEach(() => vi.clearAllMocks());

describe("HomeNav", () => {
  it("renders loading state without links", () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: true });
    render(<HomeNav />);
    expect(screen.queryByText("My leagues")).toBeNull();
    expect(screen.queryByText("Log in")).toBeNull();
  });

  it("renders Log in and Create a league links when unauthenticated", () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false });
    render(<HomeNav />);
    const loginLinks = screen.getAllByRole("link", { name: "Log in" });
    expect(loginLinks.length).toBeGreaterThan(0);
    expect(loginLinks[0]).toHaveAttribute("href", "/login");
    const createLink = screen.getByRole("link", { name: "Create a league" });
    expect(createLink).toHaveAttribute("href", "/login");
  });

  it("renders My leagues link pointing to /dashboard when authenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { displayName: "Alice", photoURL: null, email: "alice@test.com" } as never,
      loading: false,
    });
    render(<HomeNav />);
    const link = screen.getByRole("link", { name: "My leagues" });
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("renders display name when authenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { displayName: "Alice", photoURL: null, email: "alice@test.com" } as never,
      loading: false,
    });
    render(<HomeNav />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("renders Sign out button when authenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { displayName: "Alice", photoURL: null, email: "alice@test.com" } as never,
      loading: false,
    });
    render(<HomeNav />);
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("calls signOut when Sign out button is clicked", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { displayName: "Alice", photoURL: null, email: "alice@test.com" } as never,
      loading: false,
    });
    vi.mocked(signOut).mockResolvedValueOnce(undefined);
    render(<HomeNav />);
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(signOut).toHaveBeenCalledOnce();
  });

  it("renders avatar img when user has photoURL", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { displayName: "Bob", photoURL: "https://example.com/photo.jpg", email: null } as never,
      loading: false,
    });
    render(<HomeNav />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/photo.jpg");
  });

  it("renders first letter of email as fallback when no displayName and no photoURL", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { displayName: null, photoURL: null, email: "zara@test.com" } as never,
      loading: false,
    });
    render(<HomeNav />);
    expect(screen.getByText("z")).toBeInTheDocument();
  });
});
