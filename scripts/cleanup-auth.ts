import { cleanupAuth } from "@/lib/server/auth-maintenance";
import { db } from "@/lib/server/db";
import { logger } from "@/lib/server/logger";

const argumentsList = process.argv.slice(2);
const allowed = new Set(["--apply", "--dry-run"]);

try {
  if (argumentsList.some((argument) => !allowed.has(argument))) {
    throw new Error(
      "Use --dry-run (padrão) ou --apply. O lote por tabela é de até 1000 registros."
    );
  }

  if (argumentsList.includes("--apply") && argumentsList.includes("--dry-run")) {
    throw new Error("Escolha somente um modo de execução.");
  }

  const result = await cleanupAuth({ apply: argumentsList.includes("--apply") });

  logger.info(result, "Manutenção dos dados operacionais de autenticação concluída.");
} catch (error) {
  logger.error({ err: error }, "Manutenção dos dados operacionais de autenticação falhou.");
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
