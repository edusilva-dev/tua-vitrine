"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/client/auth";

export function AuthAccountMenu() {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signOut() {
    setPending(true);
    setFailed(false);

    try {
      const result = await authClient.signOut();

      if (result.error) {
        setFailed(true);

        return;
      }

      window.location.assign("/entrar");
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <Button
        variant="ghost"
        className="size-9 px-0 sm:w-auto sm:px-4"
        onClick={signOut}
        disabled={pending}
        aria-label={pending ? "Saindo da conta" : "Sair da conta"}
      >
        <LogOut aria-hidden="true" />
        <span className="hidden sm:inline">{pending ? "Saindo…" : "Sair da conta"}</span>
      </Button>
      {failed && (
        <p role="alert" className="text-sm text-destructive">
          Não foi possível sair. Tente novamente.
        </p>
      )}
    </div>
  );
}
