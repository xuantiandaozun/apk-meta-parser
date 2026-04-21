import { parseStringPool } from "./axml/stringPool";

const RES_TABLE_TYPE = 0x0002;
const RES_STRING_POOL_TYPE = 0x0001;
const RES_TABLE_PACKAGE_TYPE = 0x0200;
const RES_TABLE_TYPE_TYPE = 0x0201;
const RES_VALUE_TYPE_STRING = 0x03;
const NO_ENTRY = 0xffffffff;

/**
 * Resolve a resource ID (e.g. 0x7f0d001b) to its string value from resources.arsc.
 * Returns null if the entry is missing or not a string type.
 */
export function resolveStringResource(data: Uint8Array, resourceId: number): string | null {
  const pkgId = (resourceId >>> 24) & 0xff;
  const typeId = (resourceId >>> 16) & 0xff; // 1-based
  const entryId = resourceId & 0xffff;

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  if (view.getUint16(0, true) !== RES_TABLE_TYPE) return null;

  const tableHeaderSize = view.getUint16(2, true);
  let cursor = tableHeaderSize;

  if (cursor + 8 > data.length || view.getUint16(cursor, true) !== RES_STRING_POOL_TYPE) {
    return null;
  }

  const globalStrings = parseStringPool(view, cursor).strings;
  cursor += view.getUint32(cursor + 4, true);

  while (cursor + 8 <= data.length) {
    const chunkType = view.getUint16(cursor, true);
    const chunkSize = view.getUint32(cursor + 4, true);
    if (chunkSize <= 0) break;

    if (chunkType === RES_TABLE_PACKAGE_TYPE) {
      const thisPkgId = view.getUint32(cursor + 8, true);
      if (thisPkgId === pkgId) {
        const result = findStringInPackage(view, cursor, typeId, entryId, globalStrings);
        if (result !== null) return result;
      }
    }

    cursor += chunkSize;
  }

  return null;
}

function findStringInPackage(
  view: DataView,
  pkgBase: number,
  typeId: number,
  entryId: number,
  globalStrings: string[]
): string | null {
  const pkgHeaderSize = view.getUint16(pkgBase + 2, true);
  const pkgSize = view.getUint32(pkgBase + 4, true);
  let innerCursor = pkgBase + pkgHeaderSize;

  while (innerCursor + 8 <= pkgBase + pkgSize) {
    const innerType = view.getUint16(innerCursor, true);
    const innerSize = view.getUint32(innerCursor + 4, true);
    if (innerSize <= 0 || innerSize > pkgSize) break;

    if (innerType === RES_TABLE_TYPE_TYPE) {
      const thisTypeId = view.getUint8(innerCursor + 8);
      const entryCount = view.getUint32(innerCursor + 12, true);
      const headerSize = view.getUint16(innerCursor + 2, true);
      const entriesStart = view.getUint32(innerCursor + 16, true);

      if (thisTypeId === typeId && entryId < entryCount) {
        const entryOffset = view.getUint32(innerCursor + headerSize + entryId * 4, true);

        if (entryOffset !== NO_ENTRY) {
          const entryBase = innerCursor + entriesStart + entryOffset;
          // Res_value is 8 bytes after ResTable_entry (size=2, flags=2, key=4)
          // Res_value layout: size(2), res0(1), dataType(1), data(4)
          if (entryBase + 16 <= view.byteLength) {
            const valType = view.getUint8(entryBase + 11);
            const valData = view.getUint32(entryBase + 12, true);
            if (valType === RES_VALUE_TYPE_STRING && valData < globalStrings.length) {
              const s = globalStrings[valData];
              if (s) return s;
            }
          }
        }
      }
    }

    innerCursor += innerSize;
  }

  return null;
}
