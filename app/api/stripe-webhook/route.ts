import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // IMPORTANT: service role key, not anon key
);

const ACTIVE_PREMIUM_STATUSES = new Set(["active", "trialing"]);

type CanonicalSubscriptionStatus =
  | "inactive"
  | "trialing"
  | "active"
  | "canceled"
  | "past_due"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

function normalizeSubscriptionStatus(
  stripeStatus: Stripe.Subscription.Status,
  eventType: Stripe.Event.Type
): CanonicalSubscriptionStatus {
  if (eventType === "customer.subscription.deleted") {
    return "canceled";
  }

  if (stripeStatus === "active" || stripeStatus === "trialing") {
    return stripeStatus;
  }

  if (
    stripeStatus === "canceled" ||
    stripeStatus === "past_due" ||
    stripeStatus === "unpaid" ||
    stripeStatus === "incomplete" ||
    stripeStatus === "incomplete_expired" ||
    stripeStatus === "paused"
  ) {
    return stripeStatus;
  }

  return "inactive";
}

async function updateProfileFromSubscriptionEvent(
  subscription: Stripe.Subscription,
  eventType: Stripe.Event.Type
) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  if (!customerId) {
    throw new Error("Subscription event missing customer id");
  }

  const nextStatus = normalizeSubscriptionStatus(subscription.status, eventType);
  const updatePayload = {
    subscription_status: nextStatus,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId,
  };

  const { data, error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("stripe_customer_id", customerId)
    .select("id");

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    const premiumHint = ACTIVE_PREMIUM_STATUSES.has(nextStatus)
      ? " (premium access remains blocked until profile linkage exists)"
      : "";

    console.error(
      `No profile found for stripe_customer_id=${customerId} while processing ${eventType}.${premiumHint}`
    );
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed.", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      await updateProfileFromSubscriptionEvent(subscription, event.type);
    }
  } catch (err) {
    console.error("Failed to process Stripe webhook event.", {
      eventId: event.id,
      eventType: event.type,
      err,
    });

    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
