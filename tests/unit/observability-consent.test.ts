import { describe, expect, test } from "bun:test";
import {
  ANALYTICS_CONSENT_KEY,
  ANALYTICS_CONSENT_VERSION,
  type AnalyticsConsentProvider,
  createAnalyticsConsent,
  parseAnalyticsConsent,
} from "@/modules/observability/client/consent";
import { createBrowserIdentity } from "@/modules/observability/client/identity";
import { syncAnalyticsIdentity } from "@/modules/observability/components/analytics-identity";

function harness(options: { enabled?: boolean; stored?: string; storageFailure?: boolean } = {}) {
  const calls: string[] = [];
  const errors: unknown[] = [];
  const storage = new Map<string, string>();
  let optedIn = false;

  if (options.stored) storage.set(ANALYTICS_CONSENT_KEY, options.stored);

  const provider: AnalyticsConsentProvider = {
    initialize: () => calls.push("initialize"),
    optIn() {
      calls.push("optIn");
      optedIn = true;
    },
    optOut() {
      calls.push("optOut");
      optedIn = false;
    },
    reset() {
      calls.push("reset");
      optedIn = false;
    },
    clearConsent: () => calls.push("clearConsent"),
    hasConsent: () => optedIn,
  };
  const consent = createAnalyticsConsent({
    enabled: options.enabled ?? true,
    provider,
    storage: {
      getItem(key) {
        if (options.storageFailure) throw new Error("Armazenamento indisponível");

        return storage.get(key) ?? null;
      },
      setItem(key, value) {
        if (options.storageFailure) throw new Error("Armazenamento indisponível");

        storage.set(key, value);
      },
    },
    reportError: (error) => errors.push(error),
  });

  return { consent, provider, calls, errors, storage };
}

describe("consentimento analítico versionado", () => {
  test("somente aceita a versão e os estados reconhecidos", () => {
    for (const value of [null, "invalid", "{}", '{"version":0,"status":"accepted"}']) {
      expect(parseAnalyticsConsent(value)).toBe("unknown");
    }

    for (const status of ["accepted", "rejected"] as const) {
      expect(parseAnalyticsConsent(JSON.stringify({ version: 1, status }))).toBe(status);
    }
  });

  test("desconhecido e rejeitado não inicializam SDK nem permitem captura", () => {
    const { consent, calls } = harness();

    consent.start();
    expect(consent.getSnapshot().status).toBe("unknown");
    expect(consent.hasConsent()).toBe(false);
    consent.choose("rejected");
    expect(consent.hasConsent()).toBe(false);
    expect(calls).toEqual([]);
  });

  test("aceita imediatamente sem recarregar e restaura escolha persistida", () => {
    const { consent, calls, storage } = harness();

    consent.start();
    consent.choose("accepted");
    expect(consent.hasConsent()).toBe(true);
    expect(calls).toEqual(["initialize", "optIn"]);
    expect(JSON.parse(storage.get(ANALYTICS_CONSENT_KEY) ?? "null")).toEqual({
      version: ANALYTICS_CONSENT_VERSION,
      status: "accepted",
    });
    const restored = harness({ stored: storage.get(ANALYTICS_CONSENT_KEY) ?? "" });

    restored.consent.start();
    expect(restored.consent.hasConsent()).toBe(true);
    expect(restored.calls).toEqual(["initialize", "optIn"]);
  });

  test("revoga antes de resetar identidade e limpa a persistência SDK", () => {
    const { consent, calls } = harness();

    consent.choose("accepted");
    consent.choose("rejected");
    expect(consent.hasConsent()).toBe(false);
    expect(calls).toEqual(["initialize", "optIn", "optOut", "reset", "clearConsent"]);
    consent.choose("accepted");
    expect(consent.hasConsent()).toBe(true);
    expect(calls.at(-1)).toBe("optIn");
  });

  test("reset de logout/troca de conta preserva e reaplica consentimento aceito", () => {
    const { consent, calls } = harness();

    consent.choose("accepted");
    consent.resetIdentity();
    expect(consent.hasConsent()).toBe(true);
    expect(consent.getSnapshot().status).toBe("accepted");
    expect(calls).toEqual(["initialize", "optIn", "reset", "optIn"]);
  });

  test("produção/kill switch mantém SDK noop mesmo após aceitar", () => {
    const { consent, calls } = harness({ enabled: false });

    consent.choose("accepted");
    consent.resetIdentity();
    expect(consent.getSnapshot().status).toBe("accepted");
    expect(consent.hasConsent()).toBe(false);
    expect(calls).toEqual([]);
  });

  test("storage indisponível falha fechado na leitura e permite escolha só na aba", () => {
    const { consent, errors } = harness({ storageFailure: true });

    consent.start();
    expect(consent.hasConsent()).toBe(false);
    consent.choose("accepted");
    expect(consent.getSnapshot()).toMatchObject({ status: "accepted", persisted: false });
    expect(consent.hasConsent()).toBe(true);
    expect(errors).toHaveLength(2);
  });

  test("revogação em outra aba ou remoção da versão para captura local", () => {
    const { consent, calls, storage } = harness();

    consent.choose("accepted");
    storage.delete(ANALYTICS_CONSENT_KEY);
    consent.restore();
    expect(consent.getSnapshot().status).toBe("unknown");
    expect(consent.hasConsent()).toBe(false);
    expect(calls.slice(-3)).toEqual(["optOut", "reset", "clearConsent"]);
  });

  test("falha do SDK não permite novas capturas nem impede outras etapas de limpeza", () => {
    const { consent, provider, calls, errors } = harness();

    consent.choose("accepted");
    provider.optOut = () => {
      throw new Error("Falha no SDK");
    };
    consent.choose("rejected");
    expect(consent.hasConsent()).toBe(false);
    expect(calls.slice(-2)).toEqual(["reset", "clearConsent"]);
    expect(errors).toHaveLength(1);
  });

  test("opt-in ressincroniza pessoa/grupo e troca de conta segue capturando", () => {
    const { consent, calls } = harness();
    const firstUser = "aB3dE5fG7hJ9kL2mN4pQ6rS8tV1xY3zW";
    const secondUser = "Z9yX7wV5tS3rQ1pN8mL6kJ4hG2fE0dCb";
    const store = {
      storeId: "22222222-2222-4222-8222-222222222222",
      plan: "FREE" as const,
      status: "ACTIVE" as const,
      onboarding_step: 4,
    };
    const identity = createBrowserIdentity({
      enabled: true,
      provider: {
        identify: (id) => calls.push(`identify:${id}`),
        group: (id) => calls.push(`group:${id}`),
        reset: () => consent.resetIdentity(),
        hasConsent: () => consent.hasConsent(),
      },
    });
    const state = { currentUserId: null as string | null, currentStoreFingerprint: null };

    syncAnalyticsIdentity(identity, state, firstUser, store);
    expect(calls).toEqual([]);
    consent.choose("accepted");
    syncAnalyticsIdentity(identity, state, firstUser, store);
    syncAnalyticsIdentity(identity, state, secondUser, store);
    expect(calls).toEqual([
      "initialize",
      "optIn",
      `identify:${firstUser}`,
      `group:${store.storeId}`,
      "reset",
      "optIn",
      `identify:${secondUser}`,
      `group:${store.storeId}`,
    ]);
    expect(consent.hasConsent()).toBe(true);
  });
});
