import type { ProductInput } from "@/modules/catalog/contracts";

export type VariantDraft = ProductInput["variants"][number];

export type OptionDefinition = { name: string; values: string[] };

export function combinationKey(options: Record<string, string>): string {
  return JSON.stringify(Object.entries(options).sort(([a], [b]) => a.localeCompare(b)));
}

export function reconstructOptions(variants: VariantDraft[]): OptionDefinition[] {
  const definitions = new Map<string, Set<string>>();

  for (const variant of variants) {
    for (const [name, value] of Object.entries(variant.options)) {
      if (!definitions.has(name)) definitions.set(name, new Set());

      definitions.get(name)?.add(value);
    }
  }

  return [...definitions].map(([name, values]) => ({ name, values: [...values] }));
}

export function buildCombinations(
  definitions: OptionDefinition[],
  previous: VariantDraft[],
  defaults: Pick<VariantDraft, "priceCents" | "discountPriceCents">
): VariantDraft[] {
  if (!definitions.length) throw new Error("Adicione pelo menos uma opção.");

  const names = definitions.map(({ name }) => name.trim());

  if (names.some((name) => !name || name.length > 40)) {
    throw new Error("Dê um nome de até 40 caracteres para cada opção.");
  }

  if (new Set(names.map((name) => name.toLocaleLowerCase("pt-BR"))).size !== names.length) {
    throw new Error("Use nomes diferentes para as opções.");
  }

  const values = definitions.map((definition) => [
    ...new Set(definition.values.map((value) => value.trim())),
  ]);

  if (values.some((items) => !items.length || items.some((value) => !value || value.length > 60))) {
    throw new Error("Adicione valores de até 60 caracteres para cada opção.");
  }

  if (values.reduce((count, items) => count * items.length, 1) > 100) {
    throw new Error("O limite é de 100 combinações. Reduza os valores das opções.");
  }

  let combinations: Record<string, string>[] = [{}];

  for (const [index, items] of values.entries()) {
    const name = names[index];

    if (name === undefined) throw new Error("Opção inválida.");

    combinations = combinations.flatMap((options) =>
      items.map((value) => ({ ...options, [name]: value }))
    );
  }

  const existing = new Map(previous.map((variant) => [combinationKey(variant.options), variant]));

  return combinations.map(
    (options) =>
      existing.get(combinationKey(options)) ?? {
        options,
        priceCents: defaults.priceCents,
        discountPriceCents: defaults.discountPriceCents,
        available: true,
      }
  );
}
