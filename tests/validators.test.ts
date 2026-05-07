import { describe, expect, it } from "vitest";

import { normalizeUrl } from "@/lib/validators";

describe("normalizeUrl", () => {
  it("accepts https URLs", () => {
    expect(normalizeUrl("https://example.com/post")).toBe(
      "https://example.com/post",
    );
  });

  it("trims whitespace around a URL", () => {
    expect(normalizeUrl("  https://example.com/post  ")).toBe(
      "https://example.com/post",
    );
  });

  it("rejects unsupported protocols", () => {
    expect(normalizeUrl("ftp://example.com/file")).toBeNull();
  });

  it("rejects malformed input", () => {
    expect(normalizeUrl("not-a-url")).toBeNull();
  });
});
