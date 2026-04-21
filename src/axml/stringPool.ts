export interface StringPool {
  strings: string[];
}

export function parseStringPool(view: DataView, chunkOffset: number): StringPool {
  const stringCount = view.getUint32(chunkOffset + 8, true);
  const flags = view.getUint32(chunkOffset + 16, true);
  const stringsStart = view.getUint32(chunkOffset + 20, true);
  const headerSize = view.getUint16(chunkOffset + 2, true);

  const isUtf8 = (flags & 0x00000100) !== 0;
  const offsets: number[] = [];
  const strings: string[] = [];

  for (let i = 0; i < stringCount; i++) {
    offsets.push(view.getUint32(chunkOffset + headerSize + i * 4, true));
  }

  const stringDataOffset = chunkOffset + stringsStart;

  for (let i = 0; i < stringCount; i++) {
    try {
      const offset = stringDataOffset + offsets[i];
      const str = isUtf8
        ? readUtf8String(view, offset)
        : readUtf16String(view, offset);
      strings.push(str);
    } catch {
      strings.push("");
    }
  }

  return { strings };
}

function readUtf8String(view: DataView, offset: number): string {
  const [, firstLenBytes] = readLength8(view, offset);
  const [utf8Len, secondLenBytes] = readLength8(view, offset + firstLenBytes);
  const start = offset + firstLenBytes + secondLenBytes;
  const bytes = new Uint8Array(view.buffer, view.byteOffset + start, utf8Len);
  return new TextDecoder("utf-8").decode(bytes);
}

function readUtf16String(view: DataView, offset: number): string {
  const [len, lenBytes] = readLength16(view, offset);
  const start = offset + lenBytes;
  let out = "";
  for (let i = 0; i < len; i++) {
    out += String.fromCharCode(view.getUint16(start + i * 2, true));
  }
  return out;
}

/** UTF-8 mode variable-length prefix: 1 byte (< 0x80) or 2 bytes */
function readLength8(view: DataView, offset: number): [number, number] {
  const first = view.getUint8(offset);
  if ((first & 0x80) === 0) return [first, 1];
  const second = view.getUint8(offset + 1);
  return [((first & 0x7f) << 7) | (second & 0x7f), 2];
}

/** UTF-16 mode variable-length prefix: 2 bytes (< 0x8000) or 4 bytes */
function readLength16(view: DataView, offset: number): [number, number] {
  const first = view.getUint16(offset, true);
  if ((first & 0x8000) === 0) return [first, 2];
  const second = view.getUint16(offset + 2, true);
  return [((first & 0x7fff) << 16) | second, 4];
}
