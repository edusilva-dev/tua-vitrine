import { fileURLToPath } from "node:url";

const cli = fileURLToPath(
  new URL("../node_modules/@fission-ai/openspec/bin/openspec.js", import.meta.url)
);
const args = process.argv.slice(2);

if (args[0] === "--") {
  args.shift();
}

const child = Bun.spawn([process.execPath, "--bun", cli, ...args], {
  cwd: fileURLToPath(new URL("..", import.meta.url)),
  env: { ...process.env, OPENSPEC_TELEMETRY: "0", DO_NOT_TRACK: "1" },
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

process.exitCode = await child.exited;
