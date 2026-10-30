import { z } from "zod";

export const analyticsUserIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9]{32}$/, "O identificador deve usar o formato interno do Better Auth.");
