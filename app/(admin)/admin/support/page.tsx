import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/server/context";
import { getEnv } from "@/lib/server/env";
import { PlatformFeedbackForm } from "@/modules/feedback/components/platform-feedback-form";
import { StorefrontFeedbackSummary } from "@/modules/feedback/components/storefront-feedback-summary";
import { getStorefrontFeedbackSummary } from "@/modules/feedback/server/service";
import { getCurrentStore } from "@/modules/stores/server/service";
import { SupportForm } from "@/modules/support/components/support-form";

export default async function SupportPage() {
  if (!(await getCurrentStore())) redirect("/admin/onboarding");

  const env = getEnv();
  const enabled = Boolean(env.SUPPORT_EMAIL);
  const summary = await getStorefrontFeedbackSummary(await getAdminContext());

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
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <section className="space-y-3">
          <div>
            <h2 className="font-heading text-lg font-semibold">Precisa falar com a equipe?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Dúvidas e problemas que precisam de resposta continuam pelo canal de suporte.
            </p>
          </div>
          <SupportForm enabled={enabled} />
        </section>
        <PlatformFeedbackForm />
      </div>
      <StorefrontFeedbackSummary summary={summary} />
    </div>
  );
}
