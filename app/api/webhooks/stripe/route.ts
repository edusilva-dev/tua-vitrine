import type Stripe from "stripe";
import { handle } from "@/lib/server/http";
import { logger } from "@/lib/server/logger";
import { getStripe, getStripeWebhookSecret } from "@/lib/server/stripe";
import { processStripeEvent } from "@/modules/billing/server/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handle(async () => {
    const stripe = getStripe();
    const signature = request.headers.get("stripe-signature");

    if (!signature) return Response.json({ error: "Missing signature" }, { status: 400 });

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        await request.text(),
        signature,
        getStripeWebhookSecret()
      );
    } catch (error) {
      logger.warn({ err: error }, "Webhook do Stripe rejeitado por assinatura inválida.");

      return Response.json({ error: "Invalid signature" }, { status: 400 });
    }

    await processStripeEvent(event);
    logger.info(
      { stripeEventId: event.id, stripeEventType: event.type },
      "Webhook Stripe processado."
    );

    return Response.json({ received: true });
  });
}
