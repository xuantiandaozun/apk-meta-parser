export type ApkErrorCode =
  | "NOT_A_ZIP"
  | "MANIFEST_NOT_FOUND"
  | "INVALID_AXML"
  | "INCOMPLETE_MANIFEST";

const MESSAGES: Record<ApkErrorCode, Record<"en" | "zh", string>> = {
  NOT_A_ZIP: {
    en: "The file is not a valid ZIP/APK archive",
    zh: "文件不是有效的 ZIP/APK 压缩包",
  },
  MANIFEST_NOT_FOUND: {
    en: "AndroidManifest.xml not found in APK",
    zh: "APK 中找不到 AndroidManifest.xml",
  },
  INVALID_AXML: {
    en: "Failed to parse Android binary XML (AXML)",
    zh: "Android 二进制 XML 解析失败",
  },
  INCOMPLETE_MANIFEST: {
    en: "APK manifest is missing required fields: packageName, versionName or versionCode",
    zh: "APK 清单缺少必要字段：packageName、versionName 或 versionCode",
  },
};

export class ApkParseError extends Error {
  readonly code: ApkErrorCode;

  constructor(code: ApkErrorCode, locale: "en" | "zh" = "en", cause?: unknown) {
    super(MESSAGES[code][locale]);
    this.name = "ApkParseError";
    this.code = code;
    if (cause !== undefined) {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}
