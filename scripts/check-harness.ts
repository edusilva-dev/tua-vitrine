import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const requiredRoles = [
  "orchestrator",
  "explorer",
  "implementer-light",
  "implementer",
  "implementer-critical",
  "code-reviewer",
];
const requiredSkills = ["tua-orchestrate", "tua-deliver", "tua-review"];
const efforts = new Set(["none", "minimal", "low", "medium", "high", "xhigh", "max", "ultra"]);

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Checks repository configuration only; runtime review independence and GitHub gates are external. */
export function validateHarness(files: Readonly<Record<string, string>>): string[] {
  const errors: string[] = [];
  const parseToml = (path: string): Record<string, unknown> => {
    const source = files[path];

    if (source === undefined) {
      errors.push(`${path}: missing file`);

      return {};
    }

    try {
      return record(Bun.TOML.parse(source));
    } catch {
      errors.push(`${path}: invalid TOML`);

      return {};
    }
  };
  const validateModel = (path: string, config: Record<string, unknown>) => {
    if (!nonempty(config.model)) {
      errors.push(`${path}: missing model`);
    }

    if (!nonempty(config.model_reasoning_effort) || !efforts.has(config.model_reasoning_effort)) {
      errors.push(`${path}: unsupported or missing model_reasoning_effort`);
    }
  };

  const configPath = ".codex/config.toml";
  const config = parseToml(configPath);

  validateModel(configPath, config);
  const agents = record(config.agents);

  if (agents.enabled !== true) {
    errors.push(`${configPath}: agents.enabled must be true`);
  }

  const concurrency = agents.max_concurrent_threads_per_session;

  if (
    typeof concurrency !== "number" ||
    !Number.isInteger(concurrency) ||
    concurrency < 1 ||
    concurrency > 3
  ) {
    errors.push(`${configPath}: agents.max_concurrent_threads_per_session must be 1–3`);
  }

  const names = new Set<string>();
  const paths = Object.keys(files).sort();

  for (const path of paths.filter((path) => /^\.codex\/agents\/[^/]+\.toml$/.test(path))) {
    const agent = parseToml(path);
    const filename = path.slice(".codex/agents/".length, -".toml".length);

    for (const field of ["name", "description", "developer_instructions"]) {
      if (!nonempty(agent[field])) {
        errors.push(`${path}: missing ${field}`);
      }
    }

    if (agent.name !== filename) {
      errors.push(`${path}: name must match filename`);
    }

    if (nonempty(agent.name)) {
      if (names.has(agent.name)) {
        errors.push(`${path}: duplicate agent name`);
      }

      names.add(agent.name);
    }

    validateModel(path, agent);
  }

  for (const role of requiredRoles) {
    if (!names.has(role)) {
      errors.push(`.codex/agents/${role}.toml: missing required role`);
    }
  }

  for (const skill of requiredSkills) {
    const path = `.agents/skills/${skill}/SKILL.md`;

    if (files[path] === undefined) {
      errors.push(`${path}: missing required skill`);
    }
  }

  for (const path of paths.filter((path) => /^\.agents\/skills\/[^/]+\/SKILL\.md$/.test(path))) {
    const source = files[path] ?? "";
    const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source)?.[1];

    if (frontmatter === undefined) {
      errors.push(`${path}: missing YAML frontmatter`);
      continue;
    }

    let metadata: Record<string, unknown>;

    try {
      metadata = record(Bun.YAML.parse(frontmatter));
    } catch {
      errors.push(`${path}: invalid YAML frontmatter`);
      continue;
    }

    const directory = path.split("/")[2];

    if (metadata.name !== directory) {
      errors.push(`${path}: name must match directory`);
    }

    if (!nonempty(metadata.description)) {
      errors.push(`${path}: missing description`);
    }
  }

  for (const path of paths) {
    for (const match of (files[path] ?? "").matchAll(
      /\.agents\/skills\/[a-zA-Z0-9_-]+\/SKILL\.md/g
    )) {
      if (files[match[0]] === undefined) {
        errors.push(`${path}: missing referenced skill ${match[0]}`);
      }
    }
  }

  return errors;
}

export async function checkHarness(root: string): Promise<string[]> {
  const paths = [".codex/config.toml", "AGENTS.md"];
  const agentEntries = await readdir(join(root, ".codex/agents"), { withFileTypes: true });

  paths.push(
    ...agentEntries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".toml"))
      .map((entry) => `.codex/agents/${entry.name}`)
  );
  const skillEntries = await readdir(join(root, ".agents/skills"), { withFileTypes: true });

  for (const entry of skillEntries.filter((entry) => entry.isDirectory())) {
    const skillPath = `.agents/skills/${entry.name}/SKILL.md`;

    if (await Bun.file(join(root, skillPath)).exists()) {
      paths.push(skillPath);
    }
  }

  const files = Object.fromEntries(
    await Promise.all(paths.map(async (path) => [path, await readFile(join(root, path), "utf8")]))
  );

  return validateHarness(files);
}

if (import.meta.main) {
  try {
    const errors = await checkHarness(process.cwd());

    if (errors.length > 0) {
      process.stderr.write(`${errors.join("\n")}\n`);
      process.exitCode = 1;
    } else {
      process.stdout.write("Harness configuration valid.\n");
    }
  } catch {
    process.stderr.write("Harness check failed: unable to read repository configuration.\n");
    process.exitCode = 1;
  }
}
