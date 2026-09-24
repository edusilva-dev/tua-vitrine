"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/client/auth";

type Mode = "login" | "signup" | "recover" | "reset" | "verify";
type Fields = { name: string; email: string; password: string; confirmation: string };

const copy = {
  login: ["Bem-vindo de volta", "Entre para cuidar da sua loja.", "Entrar"],
  signup: ["Crie sua conta", "Vamos começar com seus dados de acesso.", "Criar conta"],
  recover: [
    "Esqueceu sua senha?",
    "Enviaremos as instruções para o seu e-mail.",
    "Enviar instruções",
  ],
  reset: ["Escolha uma nova senha", "Use uma senha exclusiva para sua conta.", "Salvar nova senha"],
  verify: [
    "Confirme seu e-mail",
    "Precisa de outro link? Informe o e-mail da sua conta.",
    "Reenviar link",
  ],
} as const;

function errorMessage(code: string | undefined): string {
  switch (code) {
    case "INVALID_EMAIL_OR_PASSWORD":
    case "INVALID_PASSWORD":
      return "E-mail ou senha incorretos. Confira os dados e tente novamente.";
    case "EMAIL_NOT_VERIFIED":
      return "Confirme seu e-mail antes de entrar. Você pode reenviar o link abaixo.";
    case "INVALID_TOKEN":
    case "TOKEN_EXPIRED":
      return "Este link é inválido ou expirou. Solicite um novo link.";
    case "TOO_MANY_REQUESTS":
      return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
    case "PASSWORD_TOO_SHORT":
    case "PASSWORD_TOO_LONG":
      return "Use uma senha com 12 a 128 caracteres.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "Não foi possível criar esta conta. Tente entrar ou recuperar sua senha.";
    default:
      return "Não foi possível concluir. Tente novamente em alguns instantes.";
  }
}

export function AuthForm({
  mode,
  token = "",
  invalidLink = false,
}: {
  mode: Mode;
  token?: string;
  invalidLink?: boolean;
}) {
  const [failure, setFailure] = useState("");
  const [success, setSuccess] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<Fields>();
  const [title, description, action] = copy[mode];
  const hasPassword = mode === "login" || mode === "signup" || mode === "reset";
  const newPassword = mode === "signup" || mode === "reset";
  const unusableReset = mode === "reset" && (!token || invalidLink);

  useEffect(() => setHydrated(true), []);

  async function submit(fields: Fields) {
    setFailure("");

    try {
      if (mode === "login") {
        const result = await authClient.signIn.email({
          email: fields.email.trim(),
          password: fields.password,
          callbackURL: "/admin",
        });

        if (result.error) {
          setFailure(errorMessage(result.error.code));

          return;
        }

        window.location.assign("/admin");

        return;
      }

      if (mode === "signup") {
        const result = await authClient.signUp.email({
          name: fields.name.trim(),
          email: fields.email.trim(),
          password: fields.password,
          callbackURL: "/admin",
        });

        if (result.error) {
          setFailure(errorMessage(result.error.code));

          return;
        }

        setSuccess(
          "Confira seu e-mail e abra o link de confirmação para continuar. Verifique também a pasta de spam."
        );

        return;
      }

      if (mode === "reset") {
        const result = await authClient.resetPassword({ token, newPassword: fields.password });

        if (result.error) {
          setFailure(errorMessage(result.error.code));

          return;
        }

        setSuccess("Senha alterada. Entre com sua nova senha para continuar.");

        return;
      }

      const email = fields.email.trim();
      const result =
        mode === "recover"
          ? await authClient.requestPasswordReset({ email, redirectTo: "/redefinir-senha" })
          : await authClient.sendVerificationEmail({ email, callbackURL: "/admin" });

      if (result.error) {
        setFailure(errorMessage(result.error.code));

        return;
      }

      setSuccess(
        "Se houver uma conta elegível para este e-mail, você receberá as instruções. Confira também a pasta de spam."
      );
    } catch {
      setFailure("Não foi possível conectar. Confira sua conexão e tente novamente.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <h1 className="font-heading text-2xl font-semibold">{title}</h1>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {success && (
          <p role="status" className="rounded-xl bg-muted p-4 text-sm">
            {success}
          </p>
        )}
        {(unusableReset || invalidLink) && (
          <p role="alert" className="text-sm text-destructive">
            Este link é inválido ou expirou. Solicite um novo link.
          </p>
        )}
        {!success && !unusableReset && (
          <form
            onSubmit={handleSubmit(submit)}
            className="space-y-4"
            noValidate
            aria-busy={!hydrated || isSubmitting}
          >
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="auth-name">Seu nome</Label>
                <Input
                  id="auth-name"
                  autoComplete="name"
                  maxLength={100}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? "name-error" : undefined}
                  {...register("name", {
                    validate: (value) =>
                      value.trim().length >= 2 || "Informe seu nome com pelo menos 2 caracteres.",
                  })}
                />
                {errors.name && (
                  <p id="name-error" className="text-sm text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
            )}
            {mode !== "reset" && (
              <div className="space-y-2">
                <Label htmlFor="auth-email">E-mail</Label>
                <Input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  {...register("email", {
                    required: "Informe seu e-mail.",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Informe um e-mail válido.",
                    },
                  })}
                />
                {errors.email && (
                  <p id="email-error" className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>
            )}
            {hasPassword && (
              <div className="space-y-2">
                <Label htmlFor="auth-password">{newPassword ? "Nova senha" : "Senha"}</Label>
                <Input
                  id="auth-password"
                  type="password"
                  autoComplete={newPassword ? "new-password" : "current-password"}
                  maxLength={128}
                  aria-invalid={!!errors.password}
                  aria-describedby="password-help password-error"
                  {...register("password", {
                    required: "Informe sua senha.",
                    minLength: {
                      value: newPassword ? 12 : 1,
                      message: "Use pelo menos 12 caracteres.",
                    },
                    maxLength: { value: 128, message: "Use até 128 caracteres." },
                  })}
                />
                <p id="password-help" className="text-xs text-muted-foreground">
                  {newPassword ? "Use de 12 a 128 caracteres." : "Use a senha da sua conta."}
                </p>
                <p id="password-error" className="text-sm text-destructive">
                  {errors.password?.message}
                </p>
              </div>
            )}
            {newPassword && (
              <div className="space-y-2">
                <Label htmlFor="auth-confirmation">Confirme a senha</Label>
                <Input
                  id="auth-confirmation"
                  type="password"
                  autoComplete="new-password"
                  maxLength={128}
                  aria-invalid={!!errors.confirmation}
                  aria-describedby={errors.confirmation ? "confirmation-error" : undefined}
                  {...register("confirmation", {
                    validate: (value) =>
                      value === getValues("password") || "As senhas precisam ser iguais.",
                  })}
                />
                {errors.confirmation && (
                  <p id="confirmation-error" className="text-sm text-destructive">
                    {errors.confirmation.message}
                  </p>
                )}
              </div>
            )}
            {failure && (
              <p role="alert" className="text-sm text-destructive">
                {failure}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={!hydrated || isSubmitting}>
              {isSubmitting ? "Aguarde…" : action}
            </Button>
          </form>
        )}
        <nav
          aria-label="Acesso à conta"
          className="flex flex-wrap justify-center gap-x-4 gap-y-3 text-sm"
        >
          {mode !== "login" && (
            <Link href="/entrar" className="underline underline-offset-4">
              Voltar para entrar
            </Link>
          )}
          {mode === "login" && (
            <Link href="/cadastro" className="underline underline-offset-4">
              Criar conta
            </Link>
          )}
          {(mode === "login" || mode === "reset") && (
            <Link href="/recuperar-senha" className="underline underline-offset-4">
              Recuperar senha
            </Link>
          )}
          {(mode === "login" || mode === "signup") && (
            <Link href="/verificar-email" className="underline underline-offset-4">
              Reenviar confirmação
            </Link>
          )}
        </nav>
      </CardContent>
    </Card>
  );
}
