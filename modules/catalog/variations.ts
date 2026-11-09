import type { VariantDTO } from "./contracts";

export function describeLegacyVariants(variants: Pick<VariantDTO, "options">[]): string[] {
  const options = new Map<string, string[]>();

  for (const variant of variants) {
    for (const [name, value] of Object.entries(variant.options)) {
      const values = options.get(name) ?? [];

      if (!values.includes(value)) values.push(value);

      options.set(name, values);
    }
  }

  return [...options.entries()].map(([name, values]) => `${name}: ${values.join(", ")}`);
}
