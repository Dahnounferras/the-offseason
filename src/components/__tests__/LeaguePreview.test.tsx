import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LeaguePreview from "@/components/LeaguePreview";

describe("LeaguePreview", () => {
  it("renders without crashing", () => {
    expect(() => render(<LeaguePreview />)).not.toThrow();
  });

  it("renders column headers W, L, PCT", () => {
    render(<LeaguePreview />);
    expect(screen.getByRole("columnheader", { name: "W" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "L" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "PCT" })).toBeInTheDocument();
  });

  it("renders mock team names from the standings data", () => {
    render(<LeaguePreview />);
    expect(screen.getByText("Raleigh Rim Rockers")).toBeInTheDocument();
    expect(screen.getByText("Durham Dunkers")).toBeInTheDocument();
  });

  it("shows tab buttons for Standings, Bracket, and Stats", () => {
    render(<LeaguePreview />);
    expect(screen.getByRole("button", { name: /standings/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /bracket/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /stats/i })).toBeInTheDocument();
  });
});
