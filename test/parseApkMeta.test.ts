import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApkParseError } from "../src/errors";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockManifestAsync = vi.fn();
const mockZipFile = vi.fn();
const mockLoadAsync = vi.fn();

vi.mock("jszip", () => ({
  default: {
    loadAsync: (...args: unknown[]) => mockLoadAsync(...args),
  },
}));

vi.mock("spark-md5", () => ({
  default: {
    ArrayBuffer: {
      hash: () => "d41d8cd98f00b204e9800998ecf8427e",
    },
  },
}));

// Return a minimal parsed manifest so we don't need real AXML binary
vi.mock("../src/axml/index", () => ({
  parseAndroidBinaryXml: () => ({
    package: "com.example.app",
    versionName: "1.2.3",
    versionCode: 123,
    label: "Example App",
    labelIsResourceId: false,
  }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeBlob(content = "PK\x03\x04fake-apk-content"): Blob {
  return new Blob([content]);
}

function setupZipMock(hasManifest = true) {
  mockManifestAsync.mockResolvedValue(new Uint8Array([0x03, 0x00]));
  mockZipFile.mockReturnValue(
    hasManifest ? { async: mockManifestAsync } : null
  );
  mockLoadAsync.mockResolvedValue({ file: mockZipFile });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("parseApkMeta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns correct ApkMeta for a valid APK", async () => {
    setupZipMock();
    const { parseApkMeta } = await import("../src/parseApkMeta");
    const blob = makeBlob();
    const meta = await parseApkMeta(blob);

    expect(meta.packageName).toBe("com.example.app");
    expect(meta.versionName).toBe("1.2.3");
    expect(meta.versionCode).toBe(123);
    expect(meta.label).toBe("Example App");
    expect(meta.labelIsResourceId).toBe(false);
    expect(meta.apkSize).toBe(blob.size);
    expect(meta.apkMd5).toBe("d41d8cd98f00b204e9800998ecf8427e");
  });

  it("skips MD5 when skipMd5 is true", async () => {
    setupZipMock();
    const { parseApkMeta } = await import("../src/parseApkMeta");
    const meta = await parseApkMeta(makeBlob(), { skipMd5: true });
    expect(meta.apkMd5).toBe("");
  });

  it("throws NOT_A_ZIP for non-ZIP files", async () => {
    const { parseApkMeta } = await import("../src/parseApkMeta");
    const blob = new Blob(["not a zip file at all"]);
    await expect(parseApkMeta(blob)).rejects.toMatchObject({
      code: "NOT_A_ZIP",
    });
  });

  it("throws MANIFEST_NOT_FOUND when AndroidManifest.xml is absent", async () => {
    setupZipMock(false);
    const { parseApkMeta } = await import("../src/parseApkMeta");
    await expect(parseApkMeta(makeBlob())).rejects.toMatchObject({
      code: "MANIFEST_NOT_FOUND",
    });
  });

  it("throws ApkParseError instances", async () => {
    const { parseApkMeta } = await import("../src/parseApkMeta");
    const blob = new Blob(["not-zip"]);
    await expect(parseApkMeta(blob)).rejects.toBeInstanceOf(ApkParseError);
  });

  it("uses Chinese error messages when locale is zh", async () => {
    const { parseApkMeta } = await import("../src/parseApkMeta");
    const blob = new Blob(["not-zip"]);
    try {
      await parseApkMeta(blob, { locale: "zh" });
    } catch (e) {
      expect((e as Error).message).toMatch(/[\u4e00-\u9fa5]/);
    }
  });

  it("returns partial result without throwing when partial is true", async () => {
    vi.doMock("../src/axml/index", () => ({
      parseAndroidBinaryXml: () => ({
        package: "com.example.app",
        versionName: "",
        versionCode: 0,
        label: "",
        labelIsResourceId: false,
      }),
    }));
    setupZipMock();
    // dynamic re-import to pick up new mock
    const { parseApkMeta } = await import("../src/parseApkMeta");
    const meta = await parseApkMeta(makeBlob(), { partial: true });
    expect(meta.packageName).toBe("com.example.app");
  });
});
