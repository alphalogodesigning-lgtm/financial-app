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

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature")!;

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

  // Handle subscription events
  if (event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated") {

    const subscription = event.data.object as Stripe.Subscription;

    await supabase
      .from("profiles")
      .update({
        subscription_status: subscription.status,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer,
      })
      .eq("stripe_customer_id", subscription.customer);
  }

  if (event.type === "customer.subscription.deleted") {

    const subscription = event.data.object as Stripe.Subscription;

    await supabase
      .from("profiles")
      .update({
        subscription_status: "canceled",
      })
      .eq("stripe_customer_id", subscription.customer);
  }

  return NextResponse.json({ received: true });
}
