import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    // 1. Authenticate user securely
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
      await request.json();

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Missing required payment parameters." },
        { status: 400 }
      );
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return NextResponse.json(
        { error: "Payment gateway configuration is missing." },
        { status: 500 }
      );
    }

    // 2. Verify Razorpay Signature securely
    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      console.error("❌ Razorpay signature verification failed!");
      return NextResponse.json(
        { error: "Payment signature verification failed. Possible fraud attempt." },
        { status: 400 }
      );
    }

    // 3. Activate subscription (Valid for 30 days)
    const subscriptionExpiry = new Date();
    subscriptionExpiry.setDate(subscriptionExpiry.getDate() + 30); // 30 days validity

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .upsert({
        id: user.id,
        email: user.email || "",
        name: user.user_metadata?.full_name || user.user_metadata?.name || "",
        subscription_status: "active",
        subscription_expiry: subscriptionExpiry.toISOString(),
      });

    if (updateError) {
      console.error("❌ Failed to activate subscription in DB:", updateError.message);
      return NextResponse.json(
        { error: "Payment was successful, but we failed to update your account status. Please contact support." },
        { status: 500 }
      );
    }

    console.log(`✅ Subscription successfully activated for User ID: ${user.id}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ Payment verification exception:", error.message || error);
    return NextResponse.json(
      { error: "Internal server error during verification." },
      { status: 500 }
    );
  }
}
