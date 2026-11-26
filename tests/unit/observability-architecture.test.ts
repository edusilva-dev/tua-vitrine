import { describe, expect, test } from "bun:test";

const allowedImports = [
  "instrumentation-client.ts",
  "modules/observability/client/analytics.ts",
  "modules/observability/server/posthog.ts",
];

describe("limites da integração PostHog", () => {
  test("SDKs são importados apenas pelo bootstrap e adaptadores", async () => {
    const packageNames = `${["posthog", "js"].join("-")}|${["posthog", "node"].join("-")}`;
    const process = Bun.spawn(
      ["git", "grep", "-l", "-E", `from [\\"'](${packageNames})[\\"']`, "--", "*.ts", "*.tsx"],
      { stdout: "pipe", stderr: "pipe" }
    );
    const output = await new Response(process.stdout).text();
    const exitCode = await process.exited;
    const files = output.trim().split("\n").filter(Boolean).sort();

    expect(exitCode).toBe(0);
    expect(files).toEqual(allowedImports.sort());
  });
});
