import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Razorpay from "razorpay";

/**
 * Razorpay Checkout Order Creation Endpoint
 * Portfolio Edition: Gracefully falls back to a sandbox simulated order structure
 * if active Razorpay API keys are not present in the deployment environment.
 */
export async function POST() {
  try {
    // 1. Authenticate user securely
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.warn("⚠️ Razorpay API keys are missing in environment. Operating in PORTFOLIO SANDBOX MODE. Returning mock checkout order.");
      
      // Simulate natural network delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Return high-fidelity mock order response compatible with client-side widgets
      return NextResponse.json({
        id: `order_mock_${Math.random().toString(36).substring(2, 11)}`,
        amount: 4900,
        currency: "INR",
        keyId: "rzp_test_mock_key_id",
        isMock: true,
      });
    }

    // 2. Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // 3. Create a Razorpay Order
    // Amount in Razorpay is specified in paisa (1 INR = 100 paisa)
    // ₹49.00 = 4900 paisa
    const options = {
      amount: 4900,
      currency: "INR",
      receipt: `receipt_sub_${user.id.slice(0, 10)}_${Date.now()}`,
      notes: {
        userId: user.id,
        userEmail: user.email || "",
      },
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: keyId, // Send Key ID to frontend so it knows which account to initialize
    });
  } catch (error: any) {
    console.error("❌ Razorpay order creation failed:", error.message || error);
    return NextResponse.json(
      { error: "Internal server error occurred while creating order." },
      { status: 500 }
    );
  }
}
