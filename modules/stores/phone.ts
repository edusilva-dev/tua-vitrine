export function formatWhatsapp(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 15);

  if (!digits) return "+";

  if (!digits.startsWith("55")) return `+${digits}`;

  const areaCode = digits.slice(2, 4);
  const number = digits.slice(4, 15);
  const prefixLength = number.length > 8 ? 5 : 4;
  const prefix = number.slice(0, prefixLength);
  const suffix = number.slice(prefixLength);

  let formatted = "+55";

  if (areaCode) formatted += ` (${areaCode}`;

  if (areaCode.length === 2) formatted += ")";

  if (prefix) formatted += ` ${prefix}`;

  if (suffix) formatted += `-${suffix}`;

  return formatted;
}
