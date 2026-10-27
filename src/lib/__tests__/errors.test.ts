import { describe, it, expect } from "vitest";
import { errorMessage } from "@/lib/errors";

describe("errorMessage", () => {
  it("maps known Firestore codes", () => {
    expect(errorMessage({ code: "permission-denied" })).toMatch(/permission/);
    expect(errorMessage({ code: "unavailable" })).toMatch(/connection/);
    expect(errorMessage({ code: "not-found" })).toMatch(/no longer exists/);
  });

  it("falls back to a generic message", () => {
    expect(errorMessage(new Error("boom"))).toMatch(/Something went wrong/);
    expect(errorMessage(null)).toMatch(/Something went wrong/);
  });
});
