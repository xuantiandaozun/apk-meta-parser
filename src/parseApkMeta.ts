import JSZip from "jszip";
import SparkMD5 from "spark-md5";
import { parseAndroidBinaryXml } from "./axml/index";
import { ApkParseError } from "./errors";
import type { ApkMeta, ParseOptions } from "./types";

function isZipBuffer(buf: ArrayBuffer): boolean {
  const b = new Uint8Array(buf, 0, 4);
  return b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
}

export async function parseApkMeta(
  file: File | Blob,
  options: ParseOptions = {}
): Promise<ApkMeta> {
  const { skipMd5 = false, partial = false, locale = "en" } = options;

  // Validate ZIP magic number with a cheap 4-byte slice
  const header = await file.slice(0, 4).arrayBuffer();
  if (!isZipBuffer(header)) {
    throw new ApkParseError("NOT_A_ZIP", locale);
  }

  // Pass the Blob directly so JSZip can stream — avoids loading entire APK
  // into memory before we know whether the manifest exists.
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch (cause) {
    throw new ApkParseError("NOT_A_ZIP", locale, cause);
  }

  const manifestEntry = zip.file("AndroidManifest.xml");
  if (!manifestEntry) {
    throw new ApkParseError("MANIFEST_NOT_FOUND", locale);
  }

  const manifestData = await manifestEntry.async("uint8array");

  let manifest: ReturnType<typeof parseAndroidBinaryXml>;
  try {
    manifest = parseAndroidBinaryXml(manifestData);
  } catch (cause) {
    throw new ApkParseError("INVALID_AXML", locale, cause);
  }

  const packageName = manifest.package || "";
  const versionName = manifest.versionName || "";
  const versionCode = manifest.versionCode || 0;
  const labelIsResourceId = manifest.labelIsResourceId;
  const label = manifest.label || packageName;

  if (!partial && (!packageName || !versionName || !versionCode)) {
    throw new ApkParseError("INCOMPLETE_MANIFEST", locale);
  }

  // MD5 requires full file in memory — skip when caller opts out
  const apkMd5 = skipMd5
    ? ""
    : SparkMD5.ArrayBuffer.hash(await file.arrayBuffer());

  return {
    packageName,
    versionName,
    versionCode,
    label,
    labelIsResourceId,
    apkSize: file.size,
    apkMd5,
  };
}
