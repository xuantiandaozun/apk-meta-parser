export interface ApkMeta {
  /** e.g. "com.example.app" */
  packageName: string;
  /** e.g. "1.2.3" */
  versionName: string;
  /** e.g. 123 */
  versionCode: number;
  /**
   * Human-readable app name from android:label.
   * Resolved from resources.arsc when the manifest value is a resource ID.
   * Falls back to packageName when resources.arsc is missing or unparseable.
   */
  label: string;
  /**
   * True when android:label was a resource ID that could not be resolved
   * from resources.arsc. `label` will equal `packageName` in this case.
   */
  labelIsResourceId: boolean;
  /** Minimum Android SDK version declared by uses-sdk */
  minSdkVersion?: number;
  /** Target Android SDK version declared by uses-sdk */
  targetSdkVersion?: number;
  /** Permission names declared by uses-permission */
  permissions: string[];
  /** Best-effort launcher activity class name */
  mainActivity: string;
  /** File size in bytes */
  apkSize: number;
  /** MD5 hex string, empty string when skipMd5 is true */
  apkMd5: string;
}

export interface ParseOptions {
  /**
   * Skip MD5 computation. Useful for large files where you only need
   * the manifest metadata. Default: false.
   */
  skipMd5?: boolean;
  /**
   * Return partial results instead of throwing when required fields
   * (packageName / versionName / versionCode) are missing.
   * Default: false.
   */
  partial?: boolean;
  /**
   * Language for error messages.
   * Default: "en".
   */
  locale?: "en" | "zh";
}
