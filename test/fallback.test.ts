import { describe, it, expect } from "vitest";
import { applyFallbackFromStrings } from "../src/axml/fallback";
import type { ManifestResult } from "../src/axml/index";

function makeResult(overrides: Partial<ManifestResult> = {}): ManifestResult {
  return {
    package: "",
    versionName: "",
    versionCode: 0,
    label: "",
    labelIsResourceId: false,
    ...overrides,
  };
}

describe("applyFallbackFromStrings", () => {
  it("extracts package name from string pool", () => {
    const result = makeResult();
    applyFallbackFromStrings(result, ["", "", "", "", "", "", "com.example.myapp"]);
    expect(result.package).toBe("com.example.myapp");
  });

  it("does not overwrite existing package", () => {
    const result = makeResult({ package: "already.set" });
    applyFallbackFromStrings(result, ["com.other.pkg"]);
    expect(result.package).toBe("already.set");
  });

  it("extracts versionName from string pool", () => {
    const result = makeResult();
    applyFallbackFromStrings(result, ["", "", "", "", "", "", "com.ex.app", "2.5.1"]);
    expect(result.versionName).toBe("2.5.1");
  });

  it("does not use invalid version strings", () => {
    const result = makeResult();
    applyFallbackFromStrings(result, ["notaversion", "1", ".5"]);
    expect(result.versionName).toBe("");
  });

  it("extracts label from string pool (skips first 5 entries)", () => {
    const result = makeResult();
    const strings = ["", "", "", "", "", "", "com.ex.app", "1.0", "My App"];
    applyFallbackFromStrings(result, strings);
    expect(result.label).toBe("My App");
  });

  it("skips strings starting with 'android'", () => {
    const result = makeResult();
    const strings = new Array(10).fill("").concat(["android.app", "MyApp"]);
    // 'android.app' has a dot so it's skipped; 'MyApp' is candidate
    applyFallbackFromStrings(result, strings);
    expect(result.label).toBe("MyApp");
  });

  it("skips strings with dots for label", () => {
    const result = makeResult();
    const strings = new Array(10).fill("").concat(["some.class.Name", "CleanLabel"]);
    applyFallbackFromStrings(result, strings);
    expect(result.label).toBe("CleanLabel");
  });

  it("handles empty string array gracefully", () => {
    const result = makeResult();
    expect(() => applyFallbackFromStrings(result, [])).not.toThrow();
  });
});
