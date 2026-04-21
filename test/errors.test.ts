import { describe, it, expect } from "vitest";
import { ApkParseError } from "../src/errors";

describe("ApkParseError", () => {
  it("sets name, code, and English message by default", () => {
    const err = new ApkParseError("NOT_A_ZIP");
    expect(err.name).toBe("ApkParseError");
    expect(err.code).toBe("NOT_A_ZIP");
    expect(err.message).toContain("ZIP");
    expect(err instanceof Error).toBe(true);
  });

  it("uses Chinese message when locale is zh", () => {
    const err = new ApkParseError("MANIFEST_NOT_FOUND", "zh");
    expect(err.message).toContain("AndroidManifest.xml");
    expect(err.message).toMatch(/[\u4e00-\u9fa5]/); // contains Chinese characters
  });

  it("attaches cause when provided", () => {
    const cause = new Error("inner");
    const err = new ApkParseError("INVALID_AXML", "en", cause);
    expect((err as { cause?: unknown }).cause).toBe(cause);
  });

  it("covers all error codes in both locales", () => {
    const codes = [
      "NOT_A_ZIP",
      "MANIFEST_NOT_FOUND",
      "INVALID_AXML",
      "INCOMPLETE_MANIFEST",
    ] as const;

    for (const code of codes) {
      expect(() => new ApkParseError(code, "en")).not.toThrow();
      expect(() => new ApkParseError(code, "zh")).not.toThrow();
    }
  });
});
