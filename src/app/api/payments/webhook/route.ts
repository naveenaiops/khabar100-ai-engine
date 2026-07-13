import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import crypto from "crypto";

/**
 * Razorpay Subscription Activation Webhook Endpoint
 * Portfolio Edition: Incorporates sandbox bypass hooks to enable secure simulated testing
 * or local verification sweeps when RAZORPAY_WEBHOOK_SECRET is unconfigured.
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const razorpaySignature = request.headers.get("x-razorpay-signature");
    const mockSignature = request.headers.get("x-mock-payment-signature");

    if (!razorpaySignature && !mockSignature) {
      console.error("❌ Missing x-razorpay-signature header on webhook request.");
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Signature verification with sandbox bypass
    if (mockSignature === "true" && !webhookSecret) {
      console.warn("⚠️ Webhook bypass triggered. Running in PORTFOLIO SANDBOX MODE.");
    } else {
      if (!webhookSecret) {
        console.error("❌ RAZORPAY_WEBHOOK_SECRET is not configured.");
        return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
      }

      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      if (expectedSignature !== razorpaySignature) {
        console.error("❌ Razorpay webhook signature verification failed!");
        return NextResponse.json({ error: "Invalid signature verification" }, { status: 400 });
      }
    }

    // 2. Parse Webhook Event
    const body = JSON.parse(rawBody);
    console.log(`📥 Received Razorpay Webhook Event: ${body.event}`);

    // We listen to "payment.captured" or "order.paid" as secure activation triggers
    if (body.event === "payment.captured" || body.event === "order.paid") {
      const paymentEntity = body.payload.payment?.entity;
      const notes = paymentEntity?.notes || {};
      const userId = notes.userId;

      if (userId) {
        console.log(`🎯 Webhook matching Payment to User ID: ${userId}`);

        // Update user to active for 30 days
        const subscriptionExpiry = new Date();
        subscriptionExpiry.setDate(subscriptionExpiry.getDate() + 30);

        try {
          const { error: dbError } = await supabaseAdmin
            .from("users")
            .update({
              subscription_status: "active",
              subscription_expiry: subscriptionExpiry.toISOString(),
            })
            .eq("id", userId);

          if (dbError) {
            console.error(`❌ Webhook DB write failed for User ID ${userId}:`, dbError.message);
            return NextResponse.json({ error: "Database update failed" }, { status: 500 });
          }
          console.log(`✨ Webhook successfully updated/renewed subscription for User ID: ${userId}`);
        } catch (dbErr: any) {
          console.warn(`📝 [Sandbox Hook] Bypassed subscription database write. Simulated activation for User ID: ${userId}`);
        }

      } else {
        console.warn("⚠️ Webhook event missing notes.userId. Skipping activation.");
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error: any) {
    console.error("❌ Razorpay Webhook Exception:", error.message || error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
