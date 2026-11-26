import { describe, expect, test } from "bun:test";

const allowedImports = [
  "instrumentation-client.ts",
  "modules/observability/client/analytics.ts",
  "modules/observability/server/posthog.ts",
];

describe("limites da integração PostHog", () => {
  test("SDKs são importados apenas pelo bootstrap e adaptadores", async () => {
    const packageNames = [["posthog", "js"].join("-"), ["posthog", "node"].join("-")];
    const importPattern = new RegExp(`from [\\"'](${packageNames.join("|")})[\\"']`);
    const files: string[] = [];

    for await (const file of new Bun.Glob("**/*.{ts,tsx}").scan({ dot: true })) {
      if (
        file.startsWith("node_modules/") ||
        file.startsWith(".next/") ||
        file.startsWith("generated/")
      )
        continue;

      if (importPattern.test(await Bun.file(file).text())) files.push(file);
    }

    expect(files.sort()).toEqual(allowedImports.sort());
  });
});
