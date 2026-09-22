"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { type CartLine, cartSchema, likesSchema, selectionKeys } from "./selection";

const pendingSchema = z.record(z.string().uuid(), z.boolean());

type SelectionState = { cart: CartLine[]; likes: string[]; pending: Record<string, boolean> };
type SyncScope = { identity: string; controller: AbortController };
const empty = (): SelectionState => ({ cart: [], likes: [], pending: {} });

export function useSelections(storeId: string, slug: string, preview: boolean) {
  const [state, setState] = useState<SelectionState>(empty);
  const current = useRef(state);
  const [ready, setReady] = useState(false);
  const [storageFailed, setStorageFailed] = useState(false);
  const lifecycle = useRef<SyncScope | null>(null);
  const running = useRef<SyncScope | null>(null);
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keys = selectionKeys(storeId);
  const prefix = preview ? "preview:" : "";
  const identity = `${prefix + storeId}:${slug}`;

  const persist = useCallback(
    (next: SelectionState) => {
      current.current = next;
      setState(next);

      try {
        localStorage.setItem(prefix + keys.cart, JSON.stringify(next.cart));
        localStorage.setItem(prefix + keys.likes, JSON.stringify(next.likes));
        localStorage.setItem(prefix + keys.pending, JSON.stringify(next.pending));
      } catch {
        setStorageFailed(true);
      }
    },
    [keys.cart, keys.likes, keys.pending, prefix]
  );

  const sync = useCallback(async () => {
    const scope = lifecycle.current;

    if (
      preview ||
      !scope ||
      scope.identity !== identity ||
      scope.controller.signal.aborted ||
      running.current === scope ||
      !navigator.onLine
    ) {
      return;
    }

    if (retry.current !== null) {
      clearTimeout(retry.current);
      retry.current = null;
    }

    running.current = scope;
    const attempted = new Map<string, boolean>();

    try {
      while (!scope.controller.signal.aborted) {
        // Re-read after every response: interactions during a request must not be dropped.
        const entry = Object.entries(current.current.pending).find(
          ([id, liked]) => attempted.get(id) !== liked
        );

        if (!entry) {
          break;
        }

        const [productId, liked] = entry;

        attempted.set(productId, liked);

        try {
          const response = await fetch(`/api/stores/${slug}/products/${productId}/like`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ liked }),
            signal: scope.controller.signal,
          });

          if (scope.controller.signal.aborted || lifecycle.current !== scope) {
            return;
          }

          if (!response.ok && response.status !== 404) {
            continue;
          }

          if (current.current.pending[productId] === liked) {
            const pending = { ...current.current.pending };

            delete pending[productId];
            persist({ ...current.current, pending });
          }
        } catch {
          break;
        }
      }
    } finally {
      if (running.current === scope) {
        running.current = null;
      }

      if (
        lifecycle.current === scope &&
        !scope.controller.signal.aborted &&
        navigator.onLine &&
        Object.keys(current.current.pending).length &&
        retry.current === null
      ) {
        retry.current = setTimeout(() => {
          retry.current = null;
          void sync();
        }, 3000);
      }
    }
  }, [identity, persist, preview, slug]);

  useEffect(() => {
    const scope = { identity, controller: new AbortController() };

    lifecycle.current = scope;

    function read<T>(key: string, schema: z.ZodType<T>, fallback: T): T {
      try {
        const raw = localStorage.getItem(prefix + key);

        if (!raw) {
          return fallback;
        }

        const result = schema.safeParse(JSON.parse(raw));

        return result.success ? result.data : fallback;
      } catch {
        setStorageFailed(true);

        return fallback;
      }
    }

    function load(reconcile = false) {
      const likes = [...new Set(read(keys.likes, likesSchema, []))];
      const pending = preview ? {} : read(keys.pending, pendingSchema, {});
      const next = {
        cart: read(keys.cart, cartSchema, []),
        likes,
        // Reconcile favorites if the anonymous analytics session cookie was renewed.
        pending:
          reconcile && !preview
            ? { ...Object.fromEntries(likes.map((id) => [id, true])), ...pending }
            : pending,
      };

      current.current = next;
      setState(next);
      setReady(true);
    }

    load(true);
    void sync();

    function onStorage(event: StorageEvent) {
      if (
        event.key === null ||
        [keys.cart, keys.likes, keys.pending].some((key) => prefix + key === event.key)
      ) {
        load();
        void sync();
      }
    }

    function onOnline() {
      void sync();
    }

    function onOffline() {
      if (retry.current !== null) {
        clearTimeout(retry.current);
        retry.current = null;
      }
    }

    window.addEventListener("storage", onStorage);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      scope.controller.abort();

      if (lifecycle.current === scope) {
        lifecycle.current = null;
      }

      if (retry.current !== null) {
        clearTimeout(retry.current);
        retry.current = null;
      }

      window.removeEventListener("storage", onStorage);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [identity, keys.cart, keys.likes, keys.pending, prefix, preview, sync]);

  function toggleLike(productId: string) {
    if (!ready || lifecycle.current?.identity !== identity) {
      return;
    }

    const liked = !current.current.likes.includes(productId);

    if (liked && current.current.likes.length >= 1000) {
      toast.error("Você pode guardar até 1.000 favoritos. Remova um para adicionar outro.");

      return;
    }

    const likes = liked
      ? [...current.current.likes, productId]
      : current.current.likes.filter((id) => id !== productId);

    persist({
      ...current.current,
      likes,
      pending: preview ? {} : { ...current.current.pending, [productId]: liked },
    });
    void sync();
  }

  function setCart(cart: CartLine[]) {
    if (!ready || lifecycle.current?.identity !== identity) {
      return;
    }

    const validated = cartSchema.safeParse(cart);

    if (!validated.success) {
      toast.error("Confira seu carrinho: até 100 itens diferentes, com 1 a 99 unidades cada.");

      return;
    }

    persist({ ...current.current, cart: validated.data });
  }

  return { cart: state.cart, likes: state.likes, ready, storageFailed, toggleLike, setCart };
}
