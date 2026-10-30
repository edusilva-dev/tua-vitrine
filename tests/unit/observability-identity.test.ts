import { describe, expect, test } from "bun:test";
import {
  type BrowserIdentity,
  type BrowserIdentityProvider,
  createBrowserIdentity,
} from "@/modules/observability/client/identity";
import {
  type AnalyticsIdentityState,
  syncAnalyticsIdentity,
} from "@/modules/observability/components/analytics-identity";

const firstUserId = "aB3dE5fG7hJ9kL2mN4pQ6rS8tV1xY3zW";
const secondUserId = "Z9yX7wV5tS3rQ1pN8mL6kJ4hG2fE0dCb";

interface IdentityHarnessOptions {
  enabled?: boolean;
  consent?: boolean;
  identifyFailure?: boolean;
  resetFailure?: boolean;
  strict?: boolean;
}

function createIdentityHarness(options: IdentityHarnessOptions = {}) {
  const calls: string[] = [];
  const errors: unknown[] = [];
  const provider: BrowserIdentityProvider = {
    identify: (userId) => {
      calls.push(`identify:${userId}`);

      if (options.identifyFailure) throw new Error("PostHog indisponível");
    },
    reset: () => {
      calls.push("reset");

      if (options.resetFailure) throw new Error("PostHog indisponível");
    },
    hasConsent: () => options.consent ?? true,
  };
  const identity = createBrowserIdentity({
    provider,
    enabled: options.enabled ?? true,
    strict: options.strict ?? true,
    reportError: (error) => errors.push(error),
  });

  return { calls, errors, identity };
}

function createState(currentUserId: string | null = null): AnalyticsIdentityState {
  return { currentUserId };
}

describe("adaptador de identidade do browser", () => {
  test("identifica exclusivamente pelo ID interno do Better Auth", () => {
    const { calls, identity } = createIdentityHarness();

    expect(identity.identify(firstUserId)).toBe(true);
    expect(calls).toEqual([`identify:${firstUserId}`]);
  });

  test("permanece noop sem consentimento, desabilitado ou com ID inválido", () => {
    const withoutConsent = createIdentityHarness({ consent: false });
    const disabled = createIdentityHarness({ enabled: false });
    const production = createIdentityHarness({ strict: false });

    expect(withoutConsent.identity.identify(firstUserId)).toBe(false);
    expect(disabled.identity.identify(firstUserId)).toBe(false);
    expect(production.identity.identify("pessoa@example.com")).toBe(false);
    expect(withoutConsent.calls).toEqual([]);
    expect(disabled.calls).toEqual([]);
    expect(production.calls).toEqual([]);
  });

  test("rejeita identificadores pessoais em desenvolvimento", () => {
    const { identity } = createIdentityHarness();

    for (const userId of ["pessoa@example.com", "+5511999999999", "Nome Pessoal"]) {
      expect(() => identity.identify(userId)).toThrow(/Better Auth/);
    }
  });

  test("reseta mesmo desabilitado e não propaga falhas do fornecedor", () => {
    const disabled = createIdentityHarness({ enabled: false });
    const failing = createIdentityHarness({ identifyFailure: true, resetFailure: true });

    expect(disabled.identity.reset()).toBe(true);
    expect(disabled.calls).toEqual(["reset"]);
    expect(failing.identity.identify(firstUserId)).toBe(false);
    expect(failing.identity.reset()).toBe(false);
    expect(failing.errors).toHaveLength(2);
  });
});

describe("sincronização da identidade autenticada", () => {
  test("identifica uma vez e não repete em novo render", () => {
    const { calls, identity } = createIdentityHarness();
    const state = createState();

    syncAnalyticsIdentity(identity, state, firstUserId);
    syncAnalyticsIdentity(identity, state, firstUserId);

    expect(calls).toEqual([`identify:${firstUserId}`]);
    expect(state.currentUserId).toBe(firstUserId);
  });

  test("reseta antes de identificar uma nova pessoa no mesmo navegador", () => {
    const { calls, identity } = createIdentityHarness();
    const state = createState(firstUserId);

    syncAnalyticsIdentity(identity, state, secondUserId);

    expect(calls).toEqual(["reset", `identify:${secondUserId}`]);
    expect(state.currentUserId).toBe(secondUserId);
  });

  test("logout limpa a identidade sem criar uma pessoa fictícia", () => {
    const { calls, identity } = createIdentityHarness();
    const authenticatedState = createState(firstUserId);
    const localWithoutAuthState = createState();

    syncAnalyticsIdentity(identity, authenticatedState, null);
    syncAnalyticsIdentity(identity, localWithoutAuthState, null);

    expect(calls).toEqual(["reset"]);
    expect(authenticatedState.currentUserId).toBeNull();
    expect(localWithoutAuthState.currentUserId).toBeNull();
  });

  test("não mistura pessoas quando a limpeza da identidade anterior falha", () => {
    const calls: string[] = [];
    const identity: BrowserIdentity = {
      identify: (userId) => {
        calls.push(`identify:${userId}`);

        return true;
      },
      reset: () => {
        calls.push("reset");

        return false;
      },
    };
    const state = createState(firstUserId);

    syncAnalyticsIdentity(identity, state, secondUserId);

    expect(calls).toEqual(["reset"]);
    expect(state.currentUserId).toBe(firstUserId);
  });
});
