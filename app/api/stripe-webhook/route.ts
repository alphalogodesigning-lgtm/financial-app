import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // IMPORTANT: service role key, not anon key
);

const resolveCustomerId = (customer: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null => {
  if (!customer) return null;
  if (typeof customer === "string") return customer;
  return customer.id || null;
};

const resolveSupabaseUserIdFromMetadata = (
  metadata: Stripe.Metadata | undefined
): string | null => {
  const candidate = metadata?.supabase_user_id || metadata?.user_id || metadata?.auth_user_id;
  return candidate && candidate.trim() ? candidate.trim() : null;
};

const upsertProfileSubscription = async ({
  customerId,
  subscriptionId,
  status,
  supabaseUserId,
}: {
  customerId: string | null;
  subscriptionId: string;
  status: Stripe.Subscription.Status | "canceled";
  supabaseUserId: string | null;
}) => {
  const updatePayload = {
    subscription_status: status,
    stripe_subscription_id: subscriptionId,
    ...(customerId ? { stripe_customer_id: customerId } : {}),
  };

  if (customerId) {
    const byCustomer = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("stripe_customer_id", customerId)
      .select("id");

    if (byCustomer.error) {
      throw byCustomer.error;
    }

    if ((byCustomer.data || []).length > 0) {
      return;
    }
  }

  if (supabaseUserId) {
    const byUserId = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", supabaseUserId)
      .select("id")
      .maybeSingle();

    if (byUserId.error) {
      throw byUserId.error;
    }

    if (byUserId.data) {
      return;
    }
  }

  console.warn("Stripe webhook could not map subscription event to a profile row", {
    customerId,
    subscriptionId,
    status,
    supabaseUserId,
  });
};

export async function GET() {
  return new Response("Webhook route alive");
}

export async function POST(req: NextRequest) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    console.error("STRIPE_SECRET_KEY not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecret);

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error("Webhook signature verification failed.", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      await upsertProfileSubscription({
        customerId: resolveCustomerId(subscription.customer),
        subscriptionId: subscription.id,
        status: subscription.status,
        supabaseUserId: resolveSupabaseUserIdFromMetadata(subscription.metadata),
      });
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      await upsertProfileSubscription({
        customerId: resolveCustomerId(subscription.customer),
        subscriptionId: subscription.id,
        status: "canceled",
        supabaseUserId: resolveSupabaseUserIdFromMetadata(subscription.metadata),
      });
    }
  } catch (err) {
    console.error("Failed to persist Stripe subscription event", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
