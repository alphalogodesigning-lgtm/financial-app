import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type PortalFlow = "manage" | "upgrade" | "cancel" | "update_payment" | "reactivate";

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey);
};

const getAuthorizedUser = async (request: Request) => {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { error: NextResponse.json({ error: "Server misconfigured" }, { status: 500 }) };
  }

  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { supabase, user: userData.user };
};

const resolveProfile = async (supabase: SupabaseClient, userId: string, options?: { requireCustomer?: boolean }) => {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("stripe_customer_id, stripe_subscription_id, subscription_status")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return { error: NextResponse.json({ error: "Unable to read billing profile" }, { status: 500 }) };
  }

  if (!profile) {
    if (options?.requireCustomer !== false) {
      return { error: NextResponse.json({ error: "No Stripe customer found for this account" }, { status: 400 }) };
    }

    return {
      profile: {
        stripe_customer_id: null,
        stripe_subscription_id: null,
        subscription_status: "inactive",
      },
    };
  }

  if (options?.requireCustomer !== false && !profile?.stripe_customer_id) {
    return { error: NextResponse.json({ error: "No Stripe customer found for this account" }, { status: 400 }) };
  }

  return { profile };
};

const toIsoOrNull = (value?: number | null) => {
  if (!value || Number.isNaN(value)) return null;
  return new Date(value * 1000).toISOString();
};

const resolveFlowData = (flow: PortalFlow, subscriptionId: string | null) => {
  if (!subscriptionId) return undefined;

  if (flow === "cancel") {
    return {
      type: "subscription_cancel" as const,
      subscription_cancel: {
        subscription: subscriptionId,
      },
    };
  }

  if (flow === "update_payment") {
    return {
      type: "payment_method_update" as const,
    };
  }

  if (flow === "upgrade" || flow === "reactivate") {
    return {
      type: "subscription_update" as const,
      subscription_update: {
        subscription: subscriptionId,
      },
    };
  }

  return undefined;
};

export async function GET(request: Request) {
  const auth = await getAuthorizedUser(request);
  if (auth.error) return auth.error;

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const profileResult = await resolveProfile(auth.supabase, auth.user.id, { requireCustomer: false });
  if (profileResult.error) return profileResult.error;

  const stripe = new Stripe(stripeSecret);
  const subscriptionId = profileResult.profile.stripe_subscription_id || null;

  let trialEnd: string | null = null;
  let renewalDate: string | null = null;
  let endDate: string | null = null;

  if (subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      trialEnd = toIsoOrNull(subscription.trial_end);
      renewalDate = toIsoOrNull(subscription.current_period_end);
      const hasEndedOrCanceled = Boolean(subscription.ended_at || subscription.cancel_at || subscription.cancel_at_period_end);
      endDate = hasEndedOrCanceled
        ? toIsoOrNull(subscription.ended_at || subscription.cancel_at || subscription.current_period_end)
        : null;
    } catch {
      // Keep profile data response even if Stripe subscription lookup fails.
    }
  }

  return NextResponse.json({
    subscription_status: profileResult.profile.subscription_status || "inactive",
    stripe_customer_id: profileResult.profile.stripe_customer_id,
    trial_end: trialEnd,
    renewal_date: renewalDate,
    end_date: endDate,
  });
}

export async function POST(request: Request) {
  const auth = await getAuthorizedUser(request);
  if (auth.error) return auth.error;

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const profileResult = await resolveProfile(auth.supabase, auth.user.id, { requireCustomer: true });
  if (profileResult.error) return profileResult.error;

  let flow: PortalFlow = "manage";
  try {
    const body = await request.json();
    if (["manage", "upgrade", "cancel", "update_payment", "reactivate"].includes(body?.flow)) {
      flow = body.flow as PortalFlow;
    }
  } catch {
    flow = "manage";
  }

  const stripe = new Stripe(stripeSecret);
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: profileResult.profile.stripe_customer_id,
    return_url: `${new URL(request.url).origin}/index.html`,
    flow_data: resolveFlowData(flow, profileResult.profile.stripe_subscription_id || null),
  });

  return NextResponse.json({ url: portalSession.url });
}
