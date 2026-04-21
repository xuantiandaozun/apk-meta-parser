# apk-meta-parser

[![npm version](https://img.shields.io/npm/v/apk-meta-parser)](https://www.npmjs.com/package/apk-meta-parser)
[![npm downloads](https://img.shields.io/npm/dm/apk-meta-parser)](https://www.npmjs.com/package/apk-meta-parser)
[![bundle size](https://img.shields.io/bundlephobia/minzip/apk-meta-parser)](https://bundlephobia.com/package/apk-meta-parser)
[![license](https://img.shields.io/npm/l/apk-meta-parser)](./LICENSE)
[![CI](https://github.com/xuantiandaozun/apk-meta-parser/actions/workflows/ci.yml/badge.svg)](https://github.com/xuantiandaozun/apk-meta-parser/actions/workflows/ci.yml)

纯浏览器端 APK 元信息解析，无需服务端、无需 Node.js。

通过解析 APK（ZIP 格式）内的 Android 二进制 XML（`AndroidManifest.xml`）并自动解析 `resources.arsc`，提取 `packageName`、`versionName`、`versionCode`、`label`、文件大小和 MD5。

[English Documentation](./README.md)

---

## 安装

```bash
npm install apk-meta-parser jszip spark-md5
```

`jszip` 和 `spark-md5` 是 peer dependencies，需随本包一起安装。

---

## 快速开始

```javascript
import { parseApkMeta } from "apk-meta-parser";

// 配合 <input type="file" accept=".apk"> 使用
async function onFileChange(event) {
  const file = event.target.files[0];
  const meta = await parseApkMeta(file);

  console.log(meta);
  // {
  //   packageName:       "com.example.app",
  //   versionName:       "1.2.3",
  //   versionCode:       123,
  //   label:             "示例应用",
  //   labelIsResourceId: false,
  //   apkSize:           10485760,
  //   apkMd5:            "d41d8cd98f00b204e9800998ecf8427e"
  // }
}
```

---

## API

### `parseApkMeta(file, options?)`

| 参数 | 类型 | 说明 |
|------|------|------|
| `file` | `File \| Blob` | 用户选择的 `.apk` 文件对象 |
| `options` | `ParseOptions` | 可选配置项 |

返回 `Promise<ApkMeta>`。

### `ParseOptions`

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `skipMd5` | `boolean` | `false` | 跳过 MD5 计算。避免将整个文件载入内存，适合大文件（> 200 MB）只需清单信息的场景。 |
| `partial` | `boolean` | `false` | 为 `true` 时，当必要字段缺失不抛出异常，而是返回部分结果。 |
| `locale` | `"en" \| "zh"` | `"en"` | 错误消息语言。设为 `"zh"` 输出中文错误信息。 |

### `ApkMeta`

| 字段 | 类型 | 说明 |
|------|------|------|
| `packageName` | `string` | 包名，如 `"com.example.app"` |
| `versionName` | `string` | 版本名，如 `"1.2.3"` |
| `versionCode` | `number` | 版本号，如 `123` |
| `label` | `string` | 应用名称。无法解析时回落为 `packageName`。 |
| `labelIsResourceId` | `boolean` | 为 `true` 时表示 `android:label` 是资源引用（如 `@0x7F04xxxx`），未能解析为真实字符串。 |
| `apkSize` | `number` | 文件大小（字节）。 |
| `apkMd5` | `string` | MD5 十六进制字符串。`skipMd5` 为 `true` 时为空字符串。 |

---

## 错误处理

所有异常均为 `ApkParseError` 实例，可通过 `e.code` 判断错误类型。

```javascript
import { parseApkMeta, ApkParseError } from "apk-meta-parser";

try {
  const meta = await parseApkMeta(file, { locale: "zh" });
} catch (e) {
  if (e instanceof ApkParseError) {
    switch (e.code) {
      case "NOT_A_ZIP":           // 不是有效的 ZIP/APK 文件
      case "MANIFEST_NOT_FOUND":  // 找不到 AndroidManifest.xml
      case "INVALID_AXML":        // 二进制 XML 解析失败
      case "INCOMPLETE_MANIFEST": // 缺少必要字段
    }
    console.error(e.message); // 中文错误信息（locale: "zh"）
  }
}
```

### 错误码一览

| 错误码 | 说明 |
|--------|------|
| `NOT_A_ZIP` | 文件不是有效的 ZIP/APK 压缩包 |
| `MANIFEST_NOT_FOUND` | APK 中找不到 `AndroidManifest.xml` |
| `INVALID_AXML` | Android 二进制 XML 解析失败 |
| `INCOMPLETE_MANIFEST` | 清单缺少必要字段（packageName、versionName 或 versionCode） |

---

## 注意事项

| 问题 | 说明 |
|------|------|
| **label 为资源 ID** | 部分 APK 的 `android:label` 是 `@0x7F040001` 这样的资源引用，本库会自动解析 `resources.arsc` 拿到真实名称。仅当解析失败（如 `resources.arsc` 缺失）时，`label` 才回落为 `packageName`，`labelIsResourceId` 为 `true`。 |
| **大文件内存** | MD5 计算需将整个 APK 载入内存（`file.arrayBuffer()`）。200 MB 以上的 APK 在低端设备可能 OOM，建议使用 `skipMd5: true`。清单提取本身不需要全量读取。 |
| **versionCode 超 32 位** | 已处理：解析器优先从字符串池中读取完整数字字符串，回退到 `getUint32`（无符号），可保留最大约 `2^53` 的精度。 |
| **兜底准确率** | 二进制结构解析失败时，会用正则从字符串池启发式匹配包名、版本和应用名。结果可能不准确，建议开启 `partial: true` 并提示用户人工确认。 |

---

## 浏览器兼容性

依赖 `TextDecoder`、`DataView`、`Blob.prototype.arrayBuffer`、`Blob.prototype.slice`，支持所有主流现代浏览器（Chrome 79+、Firefox 79+、Safari 14.1+、Edge 79+）。

---

## 开源协议

MIT
