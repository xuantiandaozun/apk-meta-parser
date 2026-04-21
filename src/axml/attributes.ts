export function getString(strings: string[], idx: number): string {
  if (idx === 0xffffffff || idx == null) return "";
  return strings[idx] ?? "";
}

export function parseAttributeValue(
  strings: string[],
  rawValueIdx: number,
  valueType: number,
  valueData: number
): string | number | boolean {
  if (rawValueIdx !== 0xffffffff) {
    return getString(strings, rawValueIdx);
  }
  switch (valueType) {
    case 0x03:
      return getString(strings, valueData); // TYPE_STRING
    case 0x10:
    case 0x11:
      return valueData; // TYPE_INT_DEC / TYPE_INT_HEX
    case 0x12:
      return valueData !== 0; // TYPE_INT_BOOLEAN
    default:
      return valueData;
  }
}

/**
 * Parse versionCode with large-number safety.
 * Prefers the raw string value from the string pool (which preserves
 * values > 2^31), then falls back to unsigned 32-bit integer.
 */
export function parseVersionCode(
  strings: string[],
  rawValueIdx: number,
  valueData: number
): number {
  if (rawValueIdx !== 0xffffffff) {
    const s = getString(strings, rawValueIdx);
    const n = parseInt(s, 10);
    if (!isNaN(n) && n > 0) return n;
  }
  return valueData >>> 0; // unsigned 32-bit
}
