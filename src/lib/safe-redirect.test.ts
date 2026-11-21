/// <reference types="vitest/globals" />
import { safeRedirectPath } from "@/lib/safe-redirect";

describe("safeRedirectPath — без open redirect", () => {
  it("пропускає внутрішні шляхи (з query і hash)", () => {
    expect(safeRedirectPath("/analytics")).toBe("/analytics");
    expect(safeRedirectPath("/expenses?x=1#top")).toBe("/expenses?x=1#top");
  });

  it("порожнє — fallback", () => {
    expect(safeRedirectPath(null)).toBe("/dashboard");
    expect(safeRedirectPath("")).toBe("/dashboard");
  });

  it.each([
    "https://evil.com",
    "http://evil.com/dashboard",
    "//evil.com",
    "/\\evil.com",
    "\\\\evil.com",
    "@evil.com",
    "evil.com",
    "javascript:alert(1)",
    "/\tevil",
    "/%0a//evil.com".replace("%0a", "\n"),
  ])("відкидає %j", (bad) => {
    expect(safeRedirectPath(bad)).toBe("/dashboard");
  });
});
