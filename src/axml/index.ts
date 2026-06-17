import { parseStringPool } from "./stringPool";
import { getString, parseAttributeValue, parseVersionCode } from "./attributes";
import { applyFallbackFromStrings } from "./fallback";

export interface ManifestResult {
  package: string;
  versionName: string;
  versionCode: number;
  label: string;
  labelIsResourceId: boolean;
  labelResourceId?: number;
  minSdkVersion?: number;
  targetSdkVersion?: number;
  permissions: string[];
  activities: string[];
  mainActivity: string;
  iconResourceId?: number;
}

const RES_XML_TYPE = 0x0003;
const RES_STRING_POOL_TYPE = 0x0001;
const RES_XML_START_ELEMENT_TYPE = 0x0102;
const RES_XML_END_ELEMENT_TYPE = 0x0103;

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
    permissions: [],
    activities: [],
    mainActivity: "",
  };

  const xmlType = view.getUint16(0, true);
  if (xmlType !== RES_XML_TYPE) {
    throw new Error("Not a valid Android binary XML");
  }

  let strings: string[] = [];
  // Skip the file-level chunk header (headerSize bytes)
  let cursor = view.getUint16(2, true);

  const state = {
    currentActivity: "",
    currentActivityHasMainAction: false,
    currentActivityHasLauncherCategory: false,
  };

  while (cursor + 8 <= view.byteLength) {
    const chunkType = view.getUint16(cursor, true);
    const headerSize = view.getUint16(cursor + 2, true);
    const chunkSize = view.getUint32(cursor + 4, true);

    if (chunkSize <= 0 || cursor + chunkSize > view.byteLength) break;

    if (chunkType === RES_STRING_POOL_TYPE) {
      strings = parseStringPool(view, cursor).strings;
    } else if (chunkType === RES_XML_START_ELEMENT_TYPE && strings.length > 0) {
      if (cursor + 36 <= view.byteLength) {
        processStartElement(view, cursor, headerSize, strings, result, state);
      }
    } else if (chunkType === RES_XML_END_ELEMENT_TYPE && strings.length > 0) {
      processEndElement(view, cursor, strings, result, state);
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
  result: ManifestResult,
  state: {
    currentActivity: string;
    currentActivityHasMainAction: boolean;
    currentActivityHasLauncherCategory: boolean;
  }
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
      if (attrName === "versionCode") {
        attrs[attrName] = parseVersionCode(strings, rawValueIdx, valueData);
      } else if (
        (attrName === "label" || attrName === "icon") &&
        valueType === 0x01
      ) {
        attrs[attrName] = `@0x${valueData.toString(16)}`;
      } else {
        attrs[attrName] = parseAttributeValue(strings, rawValueIdx, valueType, valueData);
      }
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

  if (tagName === "uses-sdk") {
    if (attrs.minSdkVersion !== undefined)
      result.minSdkVersion = Number(attrs.minSdkVersion) || undefined;
    if (attrs.targetSdkVersion !== undefined)
      result.targetSdkVersion = Number(attrs.targetSdkVersion) || undefined;
  }

  if (tagName === "uses-permission" && attrs.name) {
    const permission = String(attrs.name);
    if (permission && !result.permissions.includes(permission)) {
      result.permissions.push(permission);
    }
  }

  if (tagName === "application" && !result.label && attrs.label) {
    const raw = String(attrs.label);
    if (RESOURCE_ID_RE.test(raw)) {
      result.labelIsResourceId = true;
      result.labelResourceId = parseResourceId(raw);
    } else {
      result.label = raw;
    }
  }

  // Extract icon resource ID from application tag
  if (tagName === "application" && attrs.icon) {
    const raw = String(attrs.icon);
    if (RESOURCE_ID_RE.test(raw)) {
      result.iconResourceId = parseResourceId(raw);
    }
  }

  if ((tagName === "activity" || tagName === "activity-alias") && attrs.name) {
    const activityName = normalizeClassName(String(attrs.name), result.package);
    state.currentActivity = activityName;
    state.currentActivityHasMainAction = false;
    state.currentActivityHasLauncherCategory = false;
    if (activityName && !result.activities.includes(activityName)) {
      result.activities.push(activityName);
    }

    if (tagName === "activity-alias" && attrs.targetActivity) {
      const targetActivity = normalizeClassName(String(attrs.targetActivity), result.package);
      if (targetActivity && !result.activities.includes(targetActivity)) {
        result.activities.push(targetActivity);
      }
    }
  }

  if (tagName === "action" && attrs.name === "android.intent.action.MAIN") {
    state.currentActivityHasMainAction = true;
  }

  if (tagName === "category" && attrs.name === "android.intent.category.LAUNCHER") {
    state.currentActivityHasLauncherCategory = true;
  }
}

function processEndElement(
  view: DataView,
  cursor: number,
  strings: string[],
  result: ManifestResult,
  state: {
    currentActivity: string;
    currentActivityHasMainAction: boolean;
    currentActivityHasLauncherCategory: boolean;
  }
): void {
  if (cursor + 24 > view.byteLength) return;

  const tagNameIdx = view.getUint32(cursor + 20, true);
  const tagName = getString(strings, tagNameIdx);

  if (tagName === "activity" || tagName === "activity-alias") {
    if (
      !result.mainActivity &&
      state.currentActivity &&
      state.currentActivityHasMainAction &&
      state.currentActivityHasLauncherCategory
    ) {
      result.mainActivity = state.currentActivity;
    }
    state.currentActivity = "";
    state.currentActivityHasMainAction = false;
    state.currentActivityHasLauncherCategory = false;
  }
}

function parseResourceId(raw: string): number | undefined {
  const value = raw.slice(1);
  const parsed =
    value.startsWith("0x") || value.startsWith("0X")
      ? parseInt(value.slice(2), 16)
      : parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeClassName(name: string, packageName: string): string {
  if (!name) return "";
  if (name.startsWith(".") && packageName) return `${packageName}${name}`;
  if (!name.includes(".") && packageName) return `${packageName}.${name}`;
  return name;
}
