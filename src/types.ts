export interface ApkIcon {
  /** Icon file name in APK (e.g., "res/drawable-mdpi/icon.png") */
  fileName: string;
  /** Density bucket (ldpi, mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi, nodpi, anydpi) */
  density: string;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  /** MIME type (e.g., "image/png", "image/webp") */
  mimeType: string;
  /** Raw icon data as Blob - use iconBlob.arrayBuffer() or createObjectURL to use */
  iconBlob: Blob;
}

export interface ApkCertificate {
  /** Certificate subject (e.g., "CN=Example, OU=Dev, O=Company") */
  subject: string;
  /** Certificate issuer */
  issuer: string;
  /** Serial number as hex string */
  serialNumber: string;
  /** Valid from timestamp (ms since epoch) */
  validFrom: number;
  /** Valid to timestamp (ms since epoch) */
  validTo: number;
  /** Signature algorithm (e.g., "SHA256withRSA") */
  signatureAlgorithm: string;
  /** Certificate version */
  version: number;
  /** SHA-1 fingerprint (hex string with colons) */
  sha1Fingerprint?: string;
  /** SHA-256 fingerprint (hex string with colons) */
  sha256Fingerprint?: string;
  /** MD5 fingerprint (hex string with colons) */
  md5Fingerprint?: string;
}

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
  /** App icons extracted from APK, sorted by density priority */
  icons: ApkIcon[];
  /** Certificates used to sign the APK */
  certificates: ApkCertificate[];
  /** Resource ID for icon if specified in manifest */
  iconResourceId?: number;
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
  /**
   * Skip icon extraction. Useful when you only need manifest metadata.
   * Default: false.
   */
  skipIcons?: boolean;
  /**
   * Skip certificate parsing. Useful when you don't need signature info.
   * Default: false.
   */
  skipCertificates?: boolean;
  /**
   * Maximum number of icons to extract. Set to 0 to extract all.
   * Icons are prioritized by density (xxxhdpi > xxhdpi > xhdpi > hdpi > mdpi > ldpi).
   * Default: 4.
   */
  maxIcons?: number;
}

/** Options specific to icon extraction */
export interface IconExtractionOptions {
  /**
   * Density priorities for sorting icons (highest priority first).
   * Default: ["xxxhdpi", "xxhdpi", "xhdpi", "hdpi", "mdpi", "ldpi", "nodpi", "anydpi"]
   */
  densityPriority?: string[];
  /**
   * Maximum number of icons to return. Set to 0 for unlimited.
   * Default: 0 (unlimited)
   */
  maxCount?: number;
}
