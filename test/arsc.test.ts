import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { parseApkMeta } from "../src/parseApkMeta";

const APK_PATH =
  "D:\\CompanySpace\\bingqi\\pda\\dist\\release\\apk\\__UNI__4C0CE87__20260101131155.apk";

describe("resources.arsc label resolution", () => {
  it("resolves app label from resources.arsc for real APK", async () => {
    if (!existsSync(APK_PATH)) {
      console.warn("Skipping: APK not found at", APK_PATH);
      return;
    }

    const buf = readFileSync(APK_PATH);
    const blob = new Blob([buf]);
    const meta = await parseApkMeta(blob, { skipMd5: true });

    expect(meta.packageName).toBe("uni.app.UNI4C0CE87");
    expect(meta.versionName).toBe("1.0.21");
    expect(meta.label).toBe("槟气PDA");
    expect(meta.labelIsResourceId).toBe(false);
  });
});
