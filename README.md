# apk-meta-parser

[![npm version](https://img.shields.io/npm/v/apk-meta-parser)](https://www.npmjs.com/package/apk-meta-parser)
[![npm downloads](https://img.shields.io/npm/dm/apk-meta-parser)](https://www.npmjs.com/package/apk-meta-parser)
[![bundle size](https://img.shields.io/bundlephobia/minzip/apk-meta-parser)](https://bundlephobia.com/package/apk-meta-parser)
[![license](https://img.shields.io/npm/l/apk-meta-parser)](./LICENSE)
[![CI](https://github.com/xuantiandaozun/apk-meta-parser/actions/workflows/ci.yml/badge.svg)](https://github.com/xuantiandaozun/apk-meta-parser/actions/workflows/ci.yml)

Parse APK metadata entirely in the browser — no server, no Node.js.

Extracts `packageName`, `versionName`, `versionCode`, `label`, file size, and MD5 by decoding the Android binary XML (`AndroidManifest.xml`) and resolving resource IDs via `resources.arsc` inside the APK ZIP.

[中文文档](./README.zh.md)

---

## Install

```bash
npm install apk-meta-parser jszip spark-md5
```

`jszip` and `spark-md5` are peer dependencies. Install them alongside this package.

---

## Quick Start

```javascript
import { parseApkMeta } from "apk-meta-parser";

// works with <input type="file" accept=".apk">
async function onFileChange(event) {
  const file = event.target.files[0];
  const meta = await parseApkMeta(file);

  console.log(meta);
  // {
  //   packageName:      "com.example.app",
  //   versionName:      "1.2.3",
  //   versionCode:      123,
  //   label:            "Example App",
  //   labelIsResourceId: false,
  //   apkSize:          10485760,
  //   apkMd5:           "d41d8cd98f00b204e9800998ecf8427e"
  // }
}
```

---

## API

### `parseApkMeta(file, options?)`

| Parameter | Type | Description |
|-----------|------|-------------|
| `file` | `File \| Blob` | The `.apk` file object |
| `options` | `ParseOptions` | Optional configuration |

Returns `Promise<ApkMeta>`.

### `ParseOptions`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `skipMd5` | `boolean` | `false` | Skip MD5 computation. Avoids loading the entire file into memory — useful for large APKs (> 200 MB) when only manifest info is needed. |
| `partial` | `boolean` | `false` | Return partial results instead of throwing when required fields are missing. |
| `locale` | `"en" \| "zh"` | `"en"` | Language for error messages. |

### `ApkMeta`

| Field | Type | Description |
|-------|------|-------------|
| `packageName` | `string` | e.g. `"com.example.app"` |
| `versionName` | `string` | e.g. `"1.2.3"` |
| `versionCode` | `number` | e.g. `123` |
| `label` | `string` | Human-readable app name. Falls back to `packageName` when it cannot be resolved. |
| `labelIsResourceId` | `boolean` | `true` when `android:label` is a resource reference (`@0x7F04xxxx`) that cannot be resolved without `resources.arsc`. |
| `apkSize` | `number` | File size in bytes. |
| `apkMd5` | `string` | MD5 hex digest. Empty string when `skipMd5` is `true`. |

---

## Error Handling

All errors thrown are instances of `ApkParseError`.

```javascript
import { parseApkMeta, ApkParseError } from "apk-meta-parser";

try {
  const meta = await parseApkMeta(file);
} catch (e) {
  if (e instanceof ApkParseError) {
    switch (e.code) {
      case "NOT_A_ZIP":           // file is not a ZIP/APK
      case "MANIFEST_NOT_FOUND":  // AndroidManifest.xml missing
      case "INVALID_AXML":        // binary XML parse failure
      case "INCOMPLETE_MANIFEST": // packageName / versionName / versionCode missing
    }
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `NOT_A_ZIP` | The file is not a valid ZIP/APK archive |
| `MANIFEST_NOT_FOUND` | `AndroidManifest.xml` not found in the APK |
| `INVALID_AXML` | Failed to parse Android binary XML |
| `INCOMPLETE_MANIFEST` | Required manifest fields are missing |

---

## Notes & Limitations

| Topic | Detail |
|-------|--------|
| **`label` as resource ID** | `android:label` is often a resource reference like `@0x7F040001`. The parser resolves it automatically via `resources.arsc`. `labelIsResourceId` is only `true` when the lookup fails (e.g. `resources.arsc` is missing or the entry is absent). |
| **Large APKs** | `file.arrayBuffer()` (needed for MD5) loads the entire APK into memory. For files > 200 MB on low-end devices, use `skipMd5: true`. The manifest extraction itself does not require a full read. |
| **`versionCode` > 2³¹** | Handled: the parser first tries to read `versionCode` as a string from the string pool before falling back to `getUint32`, preserving values up to `Number.MAX_SAFE_INTEGER`. |
| **Fallback accuracy** | When structured parsing fails, a heuristic scans the string pool to find package name, version, and label. Results may be inaccurate; use `partial: true` and prompt the user to verify. |

---

## Browser Compatibility

Requires `TextDecoder`, `DataView`, `Blob.prototype.arrayBuffer`, and `Blob.prototype.slice` — available in all modern browsers (Chrome 79+, Firefox 79+, Safari 14.1+, Edge 79+).

---

## License

MIT
