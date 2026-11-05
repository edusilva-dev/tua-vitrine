import { describe, expect, test } from "bun:test";
import { validateHarness } from "@/scripts/check-harness";

function fixture(): Record<string, string> {
  const files: Record<string, string> = {
    ".codex/config.toml": `model = "gpt-6.1-sol"
model_reasoning_effort = "high"
[agents]
enabled = true
max_concurrent_threads_per_session = 3`,
  };

  for (const name of [
    "orchestrator",
    "explorer",
    "implementer-light",
    "implementer",
    "implementer-critical",
    "code-reviewer",
  ]) {
    files[`.codex/agents/${name}.toml`] = `name = "${name}"
description = "A bounded role"
model = "gpt-6.1-sol"
model_reasoning_effort = "high"
developer_instructions = "Read .agents/skills/tua-deliver/SKILL.md."`;
  }

  for (const name of ["tua-orchestrate", "tua-deliver", "tua-review", "openspec-apply-change"]) {
    files[`.agents/skills/${name}/SKILL.md`] = `---
name: ${name}
description: >-
  A multiline description
  for this skill.
---
Instructions.`;
  }

  return files;
}

function invalidWith(path: string, source: string): string[] {
  return validateHarness({ ...fixture(), [path]: source });
}

describe("harness configuration", () => {
  test("accepts complete TOML roles and YAML skills including generated OpenSpec skills", () => {
    expect(validateHarness(fixture())).toEqual([]);
  });

  test("accepts nonempty model identifiers without claiming account availability", () => {
    const files = fixture();
    const path = ".codex/agents/implementer.toml";

    files[path] = (files[path] ?? "").replace('model = "gpt-6.1-sol"', 'model = "future-model"');
    expect(validateHarness(files)).toEqual([]);
  });

  test("rejects malformed TOML without exposing its payload", () => {
    const errors = invalidWith(".codex/config.toml", 'model = "secret-payload');

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join("\n")).not.toContain("secret-payload");
  });

  test.each([0, 4, 1.5, '"3"'])("rejects invalid concurrency %s", (value) => {
    const files = fixture();

    files[".codex/config.toml"] =
      files[".codex/config.toml"]?.replace(
        "max_concurrent_threads_per_session = 3",
        `max_concurrent_threads_per_session = ${value}`
      ) ?? "";
    expect(validateHarness(files).length).toBeGreaterThan(0);
  });

  test("requires delegation enabled", () => {
    const files = fixture();

    files[".codex/config.toml"] =
      files[".codex/config.toml"]?.replace("enabled = true", "enabled = false") ?? "";
    expect(validateHarness(files).length).toBeGreaterThan(0);
  });

  test("requires every role", () => {
    const files = fixture();

    delete files[".codex/agents/code-reviewer.toml"];
    expect(validateHarness(files).length).toBeGreaterThan(0);
  });

  test.each(["name", "description", "developer_instructions", "model", "model_reasoning_effort"])(
    "requires agent field %s",
    (field) => {
      const files = fixture();
      const path = ".codex/agents/implementer.toml";

      files[path] = (files[path] ?? "")
        .split("\n")
        .filter((line) => !line.startsWith(`${field} =`))
        .join("\n");
      expect(validateHarness(files).length).toBeGreaterThan(0);
    }
  );

  test.each([
    ['model = "gpt-6.1-sol"', 'model = " "'],
    ['model_reasoning_effort = "high"', 'model_reasoning_effort = "extreme"'],
  ])("rejects unsupported setting %s", (before, after) => {
    const files = fixture();
    const path = ".codex/agents/implementer.toml";

    files[path] = (files[path] ?? "").replace(before, after);
    expect(validateHarness(files).length).toBeGreaterThan(0);
  });

  test("rejects duplicate names and mismatched filenames", () => {
    const files = fixture();

    files[".codex/agents/other.toml"] = files[".codex/agents/explorer.toml"] ?? "";
    expect(validateHarness(files).length).toBe(2);
  });

  test.each([
    "no frontmatter",
    "---\nname: [broken\n---\n",
    "---\nname: other\ndescription: Fine\n---\n",
    "---\nname: openspec-apply-change\ndescription: ''\n---\n",
  ])("validates discovered skill metadata %s", (source) => {
    expect(
      invalidWith(".agents/skills/openspec-apply-change/SKILL.md", source).length
    ).toBeGreaterThan(0);
  });

  test("requires repository skills and resolves references from instructions", () => {
    const files = fixture();

    delete files[".agents/skills/tua-review/SKILL.md"];
    files["AGENTS.md"] = "Read `.agents/skills/missing/SKILL.md`.";
    expect(validateHarness(files).length).toBe(2);
  });
});
