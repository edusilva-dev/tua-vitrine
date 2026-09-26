import { redirect } from "next/navigation";
import { getEnv } from "@/lib/server/env";
import { getCurrentStore } from "@/modules/stores/server/service";
import { SupportForm } from "@/modules/support/components/support-form";

export default async function SupportPage() {
  if (!(await getCurrentStore())) redirect("/admin/onboarding");

  const env = getEnv();
  const enabled = Boolean(env.SUPPORT_EMAIL && env.MAIL_TRANSPORT !== "disabled");

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">FALE COM A GENTE</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Suporte</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Tire dúvidas, relate um problema ou envie uma sugestão. Sua mensagem vai direto para a
          equipe da Tua Vitrine.
        </p>
      </div>
      <div className="max-w-3xl">
        <SupportForm enabled={enabled} />
      </div>
    </div>
  );
}
