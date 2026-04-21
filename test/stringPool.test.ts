import { describe, it, expect } from "vitest";
import { parseStringPool } from "../src/axml/stringPool";

/**
 * Build a minimal ResStringPool_header + string data buffer for testing.
 * Supports UTF-8 mode only (flag 0x100).
 */
function buildUtf8StringPoolChunk(strs: string[]): { view: DataView; offset: number } {
  const encoder = new TextEncoder();
  const encodedStrings = strs.map((s) => encoder.encode(s));

  // Calculate offsets for each string in the string data section
  const offsets: number[] = [];
  let dataSize = 0;
  for (const enc of encodedStrings) {
    offsets.push(dataSize);
    // UTF-8 string: [charLen1byte][utf8Len1byte][utf8bytes][0x00]
    dataSize += 1 + 1 + enc.length + 1;
  }

  const HEADER_SIZE = 28; // ResStringPool_header fixed size
  const offsetTableSize = strs.length * 4;
  const stringsStart = HEADER_SIZE + offsetTableSize;
  const chunkSize = stringsStart + dataSize;

  const buf = new ArrayBuffer(chunkSize);
  const dv = new DataView(buf);

  // Chunk header
  dv.setUint16(0, 0x0001, true); // type = RES_STRING_POOL_TYPE
  dv.setUint16(2, HEADER_SIZE, true); // headerSize
  dv.setUint32(4, chunkSize, true); // chunkSize
  dv.setUint32(8, strs.length, true); // stringCount
  dv.setUint32(12, 0, true); // styleCount
  dv.setUint32(16, 0x100, true); // flags = UTF8_FLAG
  dv.setUint32(20, stringsStart, true); // stringsStart
  dv.setUint32(24, 0, true); // stylesStart

  // Offset table
  for (let i = 0; i < offsets.length; i++) {
    dv.setUint32(HEADER_SIZE + i * 4, offsets[i], true);
  }

  // String data
  let pos = stringsStart;
  for (const enc of encodedStrings) {
    dv.setUint8(pos++, enc.length); // char count (1 byte, simplified)
    dv.setUint8(pos++, enc.length); // utf8 byte count
    for (const b of enc) dv.setUint8(pos++, b);
    dv.setUint8(pos++, 0x00); // null terminator
  }

  return { view: dv, offset: 0 };
}

describe("parseStringPool", () => {
  it("parses ASCII strings correctly", () => {
    const strs = ["hello", "world", "com.example.app"];
    const { view, offset } = buildUtf8StringPoolChunk(strs);
    const pool = parseStringPool(view, offset);
    expect(pool.strings).toEqual(strs);
  });

  it("returns empty array for zero strings", () => {
    const { view, offset } = buildUtf8StringPoolChunk([]);
    const pool = parseStringPool(view, offset);
    expect(pool.strings).toEqual([]);
  });

  it("handles single string", () => {
    const { view, offset } = buildUtf8StringPoolChunk(["only"]);
    const pool = parseStringPool(view, offset);
    expect(pool.strings[0]).toBe("only");
  });
});
