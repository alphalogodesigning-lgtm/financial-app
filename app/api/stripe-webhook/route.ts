import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey);
};

const resolveCustomerId = (customer: Stripe.Subscription["customer"] | Stripe.Checkout.Session["customer"]) => {
  if (!customer) return null;
  if (typeof customer === "string") return customer;
  return customer.id || null;
};

const resolveSupabaseUserIdFromMetadata = (metadata?: Record<string, string>) => {
  const candidate = metadata?.supabase_user_id || metadata?.user_id || metadata?.auth_user_id;
  return candidate && candidate.trim() ? candidate.trim() : null;
};

const normalizeString = (value?: string | null) => {
  if (!value) return null;
  const normalized = value.trim();
  return normalized || null;
};

const resolveCustomerEmail = (value?: string | null) => {
  const normalized = normalizeString(value);
  return normalized ? normalized.toLowerCase() : null;
};

const tryUpdateByEmail = async (
  supabase: SupabaseClient,
  updatePayload: Record<string, string>,
  customerEmail: string
) => {
  const byEmail = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("email", customerEmail)
    .select("id")
    .maybeSingle();

  if (byEmail.error) {
    if (byEmail.error.code === "42703") {
      return false;
    }
    throw byEmail.error;
  }

  return Boolean(byEmail.data);
};

const upsertProfileSubscription = async (
  supabase: SupabaseClient,
  {
    customerId,
    customerEmail,
    subscriptionId,
    status,
    supabaseUserId,
  }: {
    customerId: string | null;
    customerEmail: string | null;
    subscriptionId: string | null;
    status: string;
    supabaseUserId: string | null;
  }
) => {
  const updatePayload: Record<string, string> = {
    subscription_status: status,
  };

  if (subscriptionId) {
    updatePayload.stripe_subscription_id = subscriptionId;
  }

  if (customerId) {
    updatePayload.stripe_customer_id = customerId;

    const byCustomer = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("stripe_customer_id", customerId)
      .select("id");

    if (byCustomer.error) {
      throw byCustomer.error;
    }

    if ((byCustomer.data || []).length > 0) return;
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

    if (byUserId.data) return;
  }

  if (customerEmail) {
    const updated = await tryUpdateByEmail(supabase, updatePayload, customerEmail);
    if (updated) return;
  }

  console.warn("Stripe webhook could not map subscription event to a profile row", {
    customerId,
    customerEmail,
    subscriptionId,
    status,
    supabaseUserId,
  });
};

const getSubscriptionStatus = async (stripe: Stripe, subscriptionId: string | null) => {
  if (!subscriptionId) return "inactive";
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return subscription.status;
};

const getCustomerEmail = async (stripe: Stripe, customerId: string | null, fallbackEmail?: string | null) => {
  const normalizedFallback = resolveCustomerEmail(fallbackEmail || null);
  if (normalizedFallback) return normalizedFallback;
  if (!customerId) return null;

  const customer = await stripe.customers.retrieve(customerId);
  if ("deleted" in customer && customer.deleted) return null;
  return resolveCustomerEmail((customer as Stripe.Customer).email);
};

export async function GET() {
  return new Response("Webhook route alive");
}

export async function POST(req: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecret || !webhookSecret) {
    console.error("Stripe secrets are not configured");
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
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed.", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = resolveCustomerId(subscription.customer);

      await upsertProfileSubscription(supabase, {
        customerId,
        customerEmail: await getCustomerEmail(stripe, customerId),
        subscriptionId: subscription.id,
        status: subscription.status,
        supabaseUserId: resolveSupabaseUserIdFromMetadata(subscription.metadata),
      });
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = resolveCustomerId(subscription.customer);

      await upsertProfileSubscription(supabase, {
        customerId,
        customerEmail: await getCustomerEmail(stripe, customerId),
        subscriptionId: subscription.id,
        status: "canceled",
        supabaseUserId: resolveSupabaseUserIdFromMetadata(subscription.metadata),
      });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = resolveCustomerId(session.customer);
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id || null;
      const status = await getSubscriptionStatus(stripe, subscriptionId);

      await upsertProfileSubscription(supabase, {
        customerId,
        customerEmail: await getCustomerEmail(stripe, customerId, session.customer_details?.email || session.customer_email),
        subscriptionId,
        status,
        supabaseUserId:
          resolveSupabaseUserIdFromMetadata(session.metadata as Record<string, string>) ||
          normalizeString(session.client_reference_id),
      });
    }
  } catch (err) {
    console.error("Failed to persist Stripe subscription event", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
