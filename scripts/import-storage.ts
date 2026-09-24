import { constants } from "node:fs";
import { copyFile, mkdir, readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const [sourceArgument, targetArgument, mode] = process.argv.slice(2);

if (!sourceArgument || !targetArgument || (mode && mode !== "--apply")) {
  throw new Error(
    "Use: bun scripts/import-storage.ts ORIGEM DESTINO [--apply]. Sem --apply apenas confere."
  );
}

const source = resolve(sourceArgument);
const target = resolve(targetArgument);

if (source === target) throw new Error("Origem e destino devem ser diferentes.");

const files = (await readdir(source)).filter((name) => /^[a-f0-9-]+\.webp$/.test(name));
const missing: string[] = [];

for (const name of files) {
  const existing = await readFile(resolve(target, name)).catch((error: unknown) => {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;

    throw error;
  });

  if (!existing) {
    missing.push(name);
    continue;
  }

  if (!existing.equals(await readFile(resolve(source, name)))) {
    throw new Error(`Conflito de conteúdo em ${name}. Nenhum arquivo foi copiado.`);
  }
}

if (mode === "--apply") {
  await mkdir(target, { recursive: true });

  for (const name of missing) {
    await copyFile(resolve(source, name), resolve(target, name), constants.COPYFILE_EXCL);
  }
}

process.stdout.write(
  `${JSON.stringify({ dryRun: mode !== "--apply", checked: files.length, missing: missing.length })}\n`
);
