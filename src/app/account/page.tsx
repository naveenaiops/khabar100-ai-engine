"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { User, Flame, CreditCard, ShieldAlert, Sparkles, Check, CheckCircle2, Award, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function AccountPage() {
  const [category, setCategory] = useState<"upsc-prelims" | "rpsc">("upsc-prelims");
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [showCancelModal, setShowCancelCancelModal] = useState<boolean>(false);
  const [showCancelSuccess, setShowCancelSuccess] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    async function getUser() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.push("/");
      } else {
        setUser(user);
        // Fetch actual subscription status from database
        try {
          const { data: profile } = await supabase
            .from("users")
            .select("subscription_status, subscription_expiry")
            .eq("id", user.id)
            .maybeSingle();

          if (profile) {
            const active =
              profile.subscription_status === "active" &&
              (!profile.subscription_expiry || new Date(profile.subscription_expiry) > new Date());
            setIsSubscribed(active);
          }
        } catch (err) {
          console.error("Failed to load user subscription profile:", err);
        }
        setLoading(false);
      }
    }
    getUser();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleCancelSubscription = () => {
    setShowCancelCancelModal(true);
  };

  // Dynamically loads the official Razorpay script into the document body
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubscribe = async () => {
    try {
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        alert("Failed to load Razorpay SDK. Please check your internet connection.");
        return;
      }

      // Fetch newly created order from the backend
      const res = await fetch("/api/payments/create-order", { method: "POST" });
      if (!res.ok) {
        const errData = await res.json();
        alert(errData.error || "Failed to initiate payment. Please try again.");
        return;
      }

      const orderData = await res.json();

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Khabar100",
        description: "Premium UPSC/RPSC Daily MCQs Access",
        order_id: orderData.id,
        handler: async function (response: any) {
          // Send checkout values to backend for verification and activation
          const verifyRes = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          if (verifyRes.ok) {
            setIsSubscribed(true);
            alert("Payment successful! Premium access has been unlocked.");
          } else {
            const errData = await verifyRes.json();
            alert(errData.error || "Payment verification failed. Please reach out to support.");
          }
        },
        prefill: {
          name: user?.user_metadata?.name || user?.user_metadata?.full_name || "",
          email: user?.email || "",
        },
        theme: {
          color: "#10b981", // Harmonious emerald color mapping to our custom theme
        },
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();
    } catch (err: any) {
      console.error("❌ Razorpay checkout setup failed:", err.message || err);
      alert("An unexpected error occurred during setup.");
    }
  };

  const confirmCancellation = async () => {
    try {
      // Opt-out subscription status in DB
      const { error } = await supabase
        .from("users")
        .update({
          subscription_status: "free",
          subscription_expiry: null,
        })
        .eq("id", user.id);

      if (error) throw error;

      setIsSubscribed(false);
      setShowCancelCancelModal(false);
      setShowCancelSuccess(true);
      setTimeout(() => {
        setShowCancelSuccess(false);
      }, 4000);
    } catch (err: any) {
      console.error("Failed to cancel subscription:", err.message);
      alert("Failed to cancel subscription. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Loading Account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-24">
      {/* Navbar */}
      <Navbar
        currentCategory={category}
        onCategoryChange={setCategory}
        isSubscribed={isSubscribed}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 flex-1 w-full space-y-8 relative z-10">
        
        {/* Page Title */}
        <div>
          <h1 className="font-display font-black text-3xl text-slate-100 mb-1">
            Account Settings
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            Manage your personal profile, review billing statements, and check practice statistics.
          </p>
        </div>

        {/* Dynamic Warning Alert on Cancel Success */}
        {showCancelSuccess && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs flex items-start gap-2 animate-pulse">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Subscription Cancelled:</span> Your plan will remain active until the end of your billing cycle on August 7, 2026. No further charges will be made.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* User Profile Card (Left column, col-span 1) */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800/80 text-center h-fit">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-emerald-500 rounded-2xl flex items-center justify-center text-slate-950 font-black text-2xl mx-auto mb-4 shadow-md shadow-primary-500/10">
              {(user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || "A")[0].toUpperCase()}
            </div>
            <h3 className="font-display font-extrabold text-lg text-slate-100 truncate">
              {user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "Aspirant"}
            </h3>
            <p className="text-xs text-slate-500 mb-6 truncate">{user?.email}</p>

            <button 
              onClick={handleSignOut}
              className="w-full h-10 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-rose-400 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>

          {/* Subscription and Billing Details (Right columns, col-span 2) */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Membership Details */}
            <div className="glass-card rounded-2xl p-6 md:p-8 border border-slate-800/80">
              <h3 className="font-display font-bold text-base text-slate-200 mb-6 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary-400" />
                Membership Plan
              </h3>

              {isSubscribed ? (
                <div className="space-y-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded uppercase tracking-wider">
                        Active Pro Subscriber
                      </span>
                      <h4 className="text-lg font-extrabold text-slate-200 mt-2 font-display">
                        Khabar100 Monthly Pass
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Renewing automatically on August 7, 2026.
                      </p>
                    </div>
                    <p className="text-2xl font-black text-slate-100 font-display">₹49/mo</p>
                  </div>

                  {/* Payment Details info */}
                  <div className="grid grid-cols-2 gap-4 border-y border-slate-800/50 py-4 text-xs">
                    <div>
                      <p className="text-slate-500">Payment Channel</p>
                      <p className="text-slate-300 font-medium mt-0.5">Razorpay Checkout</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Subscription ID</p>
                      <p className="text-slate-300 font-mono mt-0.5">sub_razor_9123847</p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleCancelSubscription}
                      className="h-10 px-4 bg-slate-900 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/20 text-xs font-bold rounded-lg transition-all cursor-pointer"
                    >
                      Cancel Subscription
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-xs font-bold text-slate-500 bg-slate-900 px-2.5 py-0.5 rounded uppercase tracking-wider">
                        Free Account
                      </span>
                      <h4 className="text-lg font-extrabold text-slate-200 mt-2 font-display">
                        Standard Daily Demo
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Limited to 20 daily questions & 30 min reading sessions.
                      </p>
                    </div>
                    <p className="text-2xl font-black text-slate-500 font-display">₹0</p>
                  </div>

                  <div className="bg-slate-900/40 border border-slate-850 p-5 rounded-2xl">
                    <h5 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                      Upgrade to unlock standard full study
                    </h5>
                    
                    <ul className="space-y-2 mb-4 text-xs text-slate-400">
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        100 fully visible mapped questions per category daily
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        Complete historical dates archives date-picker
                      </li>
                    </ul>

                    <button
                      onClick={handleSubscribe}
                      className="w-full h-11 bg-gradient-to-r from-primary-600 to-emerald-600 hover:from-primary-500 hover:to-emerald-500 text-slate-950 font-bold text-xs rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer shadow"
                    >
                      <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                      Unlock Khabar100 Pro — ₹49/mo
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

      </main>

      {/* Subscription Cancellation Modal Dialog */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl max-w-md w-full p-6 border border-slate-800 text-center animate-fade-in">
            <h4 className="font-display font-bold text-lg text-slate-100 mb-2">
              Are you absolutely sure?
            </h4>
            <p className="text-xs text-slate-400 leading-normal mb-6">
              You will lose unlimited access to daily sets and previous archives. Khabar100 depends on subscription payments to support our expert editors who verify MCQ facts.
            </p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowCancelCancelModal(false)}
                className="h-10 px-4 bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-850 text-xs font-bold rounded-lg cursor-pointer"
              >
                Keep Plan
              </button>
              <button
                onClick={confirmCancellation}
                className="h-10 px-4 bg-rose-600 hover:bg-rose-500 text-slate-950 font-bold text-xs rounded-lg cursor-pointer"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
