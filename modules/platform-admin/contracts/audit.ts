import { z } from "zod";

export const adminAuditActions = [
  "BILLING_RECONCILE",
  "SUPPORT_UPDATE",
  "STORE_BLOCK",
  "STORE_UNBLOCK",
  "STOREFRONT_PUBLISH",
  "STOREFRONT_UNPUBLISH",
  "EMAIL_VERIFICATION_RESEND",
  "TRIAL_END",
  "MANUAL_PLAN_GRANT",
] as const;

export const adminAuditActionSchema = z.enum(adminAuditActions);

export const adminAuditResultSchema = z.enum(["SUCCESS", "FAILURE"]);

const optionalUuid = z.string().uuid().optional();

export const adminAuditListInputSchema = z
  .object({
    storeId: optionalUuid,
    adminId: optionalUuid,
    action: adminAuditActionSchema.optional(),
    result: adminAuditResultSchema.optional(),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    page: z.coerce.number().int().min(1).max(10_000).default(1),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: "A data inicial deve ser anterior à data final.",
    path: ["from"],
  });

export type AdminAuditListInput = z.infer<typeof adminAuditListInputSchema>;

export type AdminAuditAction = z.infer<typeof adminAuditActionSchema>;

export type AdminAuditResult = z.infer<typeof adminAuditResultSchema>;

export type AdminAuditItemDTO = {
  id: string;
  action: AdminAuditAction;
  result: AdminAuditResult;
  resourceType: string;
  resourceId: string;
  reason: string;
  before: unknown;
  after: unknown;
  errorCode: string | null;
  createdAt: string;
  admin: { id: string; name: string; email: string };
  store: { id: string; name: string; slug: string } | null;
};

export type AdminAuditListDTO = {
  items: AdminAuditItemDTO[];
  admins: Array<{ id: string; name: string; email: string }>;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export const adminAuditActionLabels: Record<AdminAuditAction, string> = {
  BILLING_RECONCILE: "Reconciliação da assinatura",
  SUPPORT_UPDATE: "Atualização do suporte",
  STORE_BLOCK: "Bloqueio da loja",
  STORE_UNBLOCK: "Reativação da loja",
  STOREFRONT_PUBLISH: "Publicação da vitrine",
  STOREFRONT_UNPUBLISH: "Despublicação da vitrine",
  EMAIL_VERIFICATION_RESEND: "Reenvio da confirmação",
  TRIAL_END: "Encerramento do trial",
  MANUAL_PLAN_GRANT: "Concessão manual de plano",
};
