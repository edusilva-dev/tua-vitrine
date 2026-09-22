import { money } from "@/lib/format";
import type { ResolvedLine } from "./selection";

export function whatsappLink(phone: string, message: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}

export function cartMessage(storeName: string, storeUrl: string, lines: ResolvedLine[]) {
  const subtotal = lines.reduce((sum, line) => sum + line.priceCents * line.quantity, 0);

  return [
    `Olá, ${storeName}! Tenho interesse nestes produtos:`,
    "",
    ...lines.map(
      (line) => `• ${line.quantity}x ${line.label} — ${money(line.priceCents * line.quantity)}`
    ),
    "",
    `Subtotal estimado: ${money(subtotal)}`,
    "Pode confirmar os valores e a disponibilidade?",
    storeUrl,
  ].join("\n");
}
