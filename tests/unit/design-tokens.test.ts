import { describe, expect, test } from "bun:test";
import { Glob } from "bun";

const arbitraryHexColor = /[a-z-]+-\[#[0-9a-fA-F]{3,8}\]/g;

describe("tokens de cor", () => {
  test("não permite cores hexadecimais arbitrárias nas classes", async () => {
    const glob = new Glob("{app,components,modules}/**/*.{css,ts,tsx}");
    const occurrences: string[] = [];

    for await (const path of glob.scan({ cwd: process.cwd() })) {
      const source = await Bun.file(path).text();

      for (const match of source.matchAll(arbitraryHexColor)) {
        occurrences.push(`${path}: ${match[0]}`);
      }
    }

    expect(occurrences).toEqual([]);
  });
});
