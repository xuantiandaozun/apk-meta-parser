import { parseStringPool } from "./stringPool";
import { getString, parseAttributeValue, parseVersionCode } from "./attributes";
import { applyFallbackFromStrings } from "./fallback";

export interface ManifestResult {
  package: string;
  versionName: string;
  versionCode: number;
  label: string;
  labelIsResourceId: boolean;
}

const RES_XML_TYPE = 0x0003;
const RES_STRING_POOL_TYPE = 0x0001;
const RES_XML_START_ELEMENT_TYPE = 0x0102;

/** Resource ID pattern: @0x7F040001 or @2130903041 */
const RESOURCE_ID_RE = /^@(?:0x[0-9a-f]+|\d+)$/i;

export function parseAndroidBinaryXml(data: Uint8Array): ManifestResult {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const result: ManifestResult = {
    package: "",
    versionName: "",
    versionCode: 0,
    label: "",
    labelIsResourceId: false,
  };

  const xmlType = view.getUint16(0, true);
  if (xmlType !== RES_XML_TYPE) {
    throw new Error("Not a valid Android binary XML");
  }

  let strings: string[] = [];
  // Skip the file-level chunk header (headerSize bytes)
  let cursor = view.getUint16(2, true);

  while (cursor + 8 <= view.byteLength) {
    const chunkType = view.getUint16(cursor, true);
    const headerSize = view.getUint16(cursor + 2, true);
    const chunkSize = view.getUint32(cursor + 4, true);

    if (chunkSize <= 0 || cursor + chunkSize > view.byteLength) break;

    if (chunkType === RES_STRING_POOL_TYPE) {
      strings = parseStringPool(view, cursor).strings;
    } else if (chunkType === RES_XML_START_ELEMENT_TYPE && strings.length > 0) {
      if (cursor + 36 <= view.byteLength) {
        processStartElement(view, cursor, headerSize, strings, result);
      }
    }

    cursor += chunkSize;
  }

  const needsFallback =
    !result.package || !result.versionName || !result.versionCode || !result.label;

  if (needsFallback) {
    applyFallbackFromStrings(result, strings);
  }

  return result;
}

function processStartElement(
  view: DataView,
  cursor: number,
  headerSize: number,
  strings: string[],
  result: ManifestResult
): void {
  const tagNameIdx = view.getUint32(cursor + 20, true);
  const tagName = getString(strings, tagNameIdx);

  // Positions within the START_ELEMENT chunk (from chunk start):
  //   +24 attributeStart — offset from body start (cursor+headerSize) to first attribute
  //   +26 attributeSize  — size of each attribute record (always 20)
  //   +28 attributeCount
  const attrStart = view.getUint16(cursor + 24, true);
  const attrSize = view.getUint16(cursor + 26, true) || 20;
  const attrCount = view.getUint16(cursor + 28, true);

  const attrs: Record<string, string | number | boolean> = {};
  let attrCursor = cursor + headerSize + attrStart;

  for (let i = 0; i < attrCount; i++) {
    if (attrCursor + 20 > view.byteLength) break;

    const nameIdx = view.getUint32(attrCursor + 4, true);
    const rawValueIdx = view.getUint32(attrCursor + 8, true);
    const valueType = view.getUint8(attrCursor + 15);
    const valueData = view.getUint32(attrCursor + 16, true);

    const attrName = getString(strings, nameIdx);
    if (attrName) {
      attrs[attrName] =
        attrName === "versionCode"
          ? parseVersionCode(strings, rawValueIdx, valueData)
          : parseAttributeValue(strings, rawValueIdx, valueType, valueData);
    }

    attrCursor += attrSize;
  }

  if (tagName === "manifest") {
    if (!result.package && attrs.package) result.package = String(attrs.package);
    if (!result.versionName && attrs.versionName)
      result.versionName = String(attrs.versionName);
    if (!result.versionCode && attrs.versionCode)
      result.versionCode = Number(attrs.versionCode) || 0;
  }

  if (tagName === "application" && !result.label && attrs.label) {
    const raw = String(attrs.label);
    if (RESOURCE_ID_RE.test(raw)) {
      result.labelIsResourceId = true;
    } else {
      result.label = raw;
    }
  }
}
