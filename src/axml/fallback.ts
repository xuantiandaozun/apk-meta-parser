import type { ManifestResult } from "./index";

/**
 * Heuristic fallback: extract package / versionName / label from raw
 * string pool entries when the structured parse path fails.
 * Results may be inaccurate — callers should warn users accordingly.
 */
export function applyFallbackFromStrings(result: ManifestResult, strings: string[]): void {
  if (!strings?.length) return;

  if (!result.package) {
    for (const str of strings) {
      if (str && /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){1,}/i.test(str)) {
        result.package = str;
        break;
      }
    }
  }

  if (!result.versionName) {
    for (const str of strings) {
      if (str && /^\d+\.\d[\d.]*$/.test(str)) {
        result.versionName = str;
        break;
      }
    }
  }

  if (!result.label) {
    for (let i = 0; i < strings.length; i++) {
      const str = strings[i];
      if (!str || str.length < 2 || str.length > 60) continue;
      if (str.startsWith("android")) continue;
      if (str.includes(".")) continue;
      if (/^[0-9]+$/.test(str)) continue;
      if (/^[@#]/.test(str)) continue;
      if (i <= 5) continue;
      result.label = str;
      break;
    }
  }
}
