import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey);
};

const premiumStatuses = new Set(["trialing", "active"]);

const pickSubscription = (items: Stripe.Subscription[]) => {
  if (!items.length) return null;
  const premium = items.find((item) => premiumStatuses.has(item.status));
  return premium || items[0];
};

export async function POST(req: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = userData.user.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "User email unavailable" }, { status: 400 });
  }

  const stripe = new Stripe(stripeSecret);
  const customers = await stripe.customers.list({ email, limit: 1 });
  const customer = customers.data[0] || null;

  if (!customer || customer.deleted) {
    return NextResponse.json({ synced: false, reason: "customer_not_found" });
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: customer.id,
    status: "all",
    limit: 10,
  });

  const selected = pickSubscription(subscriptions.data);
  const status = selected?.status || "inactive";

  const payload: Record<string, string> = {
    subscription_status: status,
    stripe_customer_id: customer.id,
  };

  if (selected?.id) {
    payload.stripe_subscription_id = selected.id;
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userData.user.id);

  if (updateError) {
    console.error("Stripe sync update failed", updateError);
    return NextResponse.json({ error: "Sync update failed" }, { status: 500 });
  }

  return NextResponse.json({ synced: true, status });
}
