# apk-meta-parser

纯浏览器端 APK 元信息解析 npm 包。

## 项目概况

- **npm 包名**：`apk-meta-parser`
- **npm 主页**：https://www.npmjs.com/package/apk-meta-parser
- **GitHub 仓库**：https://github.com/xuantiandaozun/apk-meta-parser
- **npm 账号**：zhouxiaoma（注意：本地 npm 默认源是 CNPM，发布须加 `--registry https://registry.npmjs.org`）

## 技术栈

| 用途 | 工具 |
|------|------|
| 语言 | TypeScript 5 |
| 打包 | tsup（输出 ESM + CJS + `.d.ts`） |
| 测试 | Vitest + happy-dom |
| Lint | ESLint 9 + typescript-eslint（配置文件为 `eslint.config.mjs`，必须用 `.mjs` 后缀） |
| CI/CD | GitHub Actions |

## 核心 API

```ts
parseApkMeta(file: File | Blob, options?: ParseOptions): Promise<ApkMeta>
```

`ParseOptions`：`skipMd5`、`partial`、`locale`（`"en"` | `"zh"`）

`ApkMeta`：`packageName`、`versionName`、`versionCode`、`label`、`labelIsResourceId`、`apkSize`、`apkMd5`

错误类：`ApkParseError`，错误码：`NOT_A_ZIP` | `MANIFEST_NOT_FOUND` | `INVALID_AXML` | `INCOMPLETE_MANIFEST`

## 目录结构

```
src/
├── index.ts              # 公开 API 导出
├── types.ts              # ApkMeta / ParseOptions
├── errors.ts             # ApkParseError + 双语错误消息
├── parseApkMeta.ts       # 主函数
└── axml/
    ├── index.ts          # parseAndroidBinaryXml
    ├── stringPool.ts     # UTF-8/UTF-16 字符串池解析
    ├── attributes.ts     # 属性值解析 + versionCode 大数处理
    └── fallback.ts       # 兜底启发式匹配
test/                     # 36 个单元测试
```

## 发布流程

后续版本升级：
1. 修改 `package.json` 中的 `version`
2. 更新 `CHANGELOG.md`
3. `git commit` + `git push`
4. `git tag v0.x.x && git push origin v0.x.x` → 自动触发 GitHub Actions 发布到 npm

## 已知问题 / 注意事项

- **eslint.config 必须是 `.mjs`**：package.json 没有 `"type": "module"`，`.js` 在 Node 18 下被当 CJS 处理，ESLint 9 的 flat config 用 ESM 语法会报错。
- **`@rollup/rollup-win32-x64-msvc` 在 `optionalDependencies`**：本地 Windows 开发时 npm 有 bug 不自动安装此包，放 optionalDependencies 让 CI（Linux）自动跳过。
- **npm 2FA**：账号开启了 2FA，CI 用的 Granular Token 需勾选 "Bypass 2FA"；本地手动发布用 `--otp=<code>` 或 `NODE_AUTH_TOKEN` 环境变量。
- **label 资源 ID**：部分 APK 的 `android:label` 是 `@0x7Fxxxxxx` 资源引用，无法在不解析 `resources.arsc` 的情况下获取真实名称，此时 `labelIsResourceId=true`，`label` 回落为 `packageName`。
- **peer dependencies**：`jszip` 和 `spark-md5` 由使用方安装，不打进包内。
