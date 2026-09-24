import { cleanupAssets } from "@/lib/server/asset-cleanup";
import { db } from "@/lib/server/db";
import { logger } from "@/lib/server/logger";

const argumentsList = process.argv.slice(2);
const allowed = new Set(["--apply", "--dry-run"]);

try {
  if (argumentsList.some((argument) => !allowed.has(argument))) {
    throw new Error(
      "Use --dry-run (padrão) ou --apply. O lote é de até 100 uploads com mais de 24h."
    );
  }

  if (argumentsList.includes("--apply") && argumentsList.includes("--dry-run")) {
    throw new Error("Escolha somente um modo de execução.");
  }

  const result = await cleanupAssets({ apply: argumentsList.includes("--apply") });

  logger.info(result, "Limpeza de uploads concluída.");

  if (result.failures.length) process.exitCode = 1;
} catch (error) {
  logger.error({ err: error }, "Limpeza de uploads falhou.");
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
