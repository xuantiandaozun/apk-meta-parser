import { describe, it, expect } from "vitest";
import { getString, parseAttributeValue, parseVersionCode } from "../src/axml/attributes";

const STRINGS = ["hello", "world", "com.example.app", "1.0.0"];

describe("getString", () => {
  it("returns string at valid index", () => {
    expect(getString(STRINGS, 0)).toBe("hello");
    expect(getString(STRINGS, 3)).toBe("1.0.0");
  });

  it("returns empty string for 0xFFFFFFFF", () => {
    expect(getString(STRINGS, 0xffffffff)).toBe("");
  });

  it("returns empty string for out-of-bounds index", () => {
    expect(getString(STRINGS, 99)).toBe("");
  });
});

describe("parseAttributeValue", () => {
  it("returns string from raw value index when not 0xFFFFFFFF", () => {
    expect(parseAttributeValue(STRINGS, 2, 0x03, 0)).toBe("com.example.app");
  });

  it("resolves TYPE_STRING (0x03) from valueData when rawValueIdx is 0xFFFFFFFF", () => {
    expect(parseAttributeValue(STRINGS, 0xffffffff, 0x03, 1)).toBe("world");
  });

  it("returns number for TYPE_INT_DEC (0x10)", () => {
    expect(parseAttributeValue(STRINGS, 0xffffffff, 0x10, 42)).toBe(42);
  });

  it("returns number for TYPE_INT_HEX (0x11)", () => {
    expect(parseAttributeValue(STRINGS, 0xffffffff, 0x11, 0xff)).toBe(255);
  });

  it("returns true for TYPE_INT_BOOLEAN non-zero", () => {
    expect(parseAttributeValue(STRINGS, 0xffffffff, 0x12, 1)).toBe(true);
  });

  it("returns false for TYPE_INT_BOOLEAN zero", () => {
    expect(parseAttributeValue(STRINGS, 0xffffffff, 0x12, 0)).toBe(false);
  });

  it("returns raw valueData for unknown type", () => {
    expect(parseAttributeValue(STRINGS, 0xffffffff, 0xff, 999)).toBe(999);
  });
});

describe("parseVersionCode", () => {
  it("reads from string pool when rawValueIdx is valid", () => {
    const strings = ["not-a-number", "123", "456"];
    expect(parseVersionCode(strings, 1, 0)).toBe(123);
  });

  it("falls back to unsigned 32-bit valueData", () => {
    expect(parseVersionCode(STRINGS, 0xffffffff, 100)).toBe(100);
  });

  it("treats valueData as unsigned (no negative overflow)", () => {
    // 0x80000001 = 2147483649 as unsigned, -2147483647 as signed
    expect(parseVersionCode([], 0xffffffff, 0x80000001)).toBe(2147483649);
  });

  it("ignores non-numeric string pool entries", () => {
    const strings = ["hello"];
    expect(parseVersionCode(strings, 0, 55)).toBe(55);
  });
});
