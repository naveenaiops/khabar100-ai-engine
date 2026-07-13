"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Navbar } from "@/components/Navbar";
import { QuestionCard } from "@/components/QuestionCard";
import { PaywallOverlay } from "@/components/PaywallOverlay";
import { generateMockQuestions, Question } from "@/lib/mockData";
import { Calendar, History, ArrowLeft, Sparkles, Shield, Bookmark, Award } from "lucide-react";
import Link from "next/link";

export default function ArchivePage() {
  const [category, setCategory] = useState<"upsc-prelims" | "rpsc">("upsc-prelims");
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const router = useRouter();

  // Protect the route and redirect unauthenticated users
  useEffect(() => {
    async function checkAuth() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.push("/");
      } else {
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
          console.error("Failed to load user subscription profile in Archive:", err);
        }
        setAuthLoading(false);
      }
    }
    checkAuth();
  }, [router]);
  const [archiveDates, setArchiveDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [unlockedCount, setUnlockedCount] = useState<number>(20);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isPaywallTriggered, setIsPaywallTriggered] = useState<boolean>(false);

  const [allDbQuestions, setAllDbQuestions] = useState<Question[]>([]);

  // Fetch unique list of archive dates in the database
  useEffect(() => {
    async function loadArchiveDates() {
      try {
        const res = await fetch(`/api/archive?category=${category}`);
        if (res.ok) {
          const { dates } = await res.json();
          if (dates && dates.length > 0) {
            setArchiveDates(dates);
            setSelectedDate(dates[0]); // Auto-select the latest historical date
            return;
          }
        }
      } catch (err) {
        console.warn("⚠️ Archive dates fetching failed, using fallback anchor:", err);
      }
      // Fallback
      setArchiveDates(["2026-07-09"]);
      setSelectedDate("2026-07-09");
    }
    loadArchiveDates();
  }, [category]);

  // Fetch / load questions for selected archive date
  useEffect(() => {
    async function loadArchiveQuestions() {
      if (!selectedDate) return;
      try {
        const res = await fetch(`/api/archive?category=${category}&date=${selectedDate}`);
        if (res.ok) {
          const { questions: dbQ } = await res.json();
          if (dbQ && dbQ.length > 0) {
            setAllDbQuestions(dbQ);
            setQuestions(dbQ.slice(0, 20));
            setUnlockedCount(Math.min(20, dbQ.length));
            setIsPaywallTriggered(false);
            return;
          }
        }
      } catch (err) {
        console.warn("⚠️ Archive questions API issue, loading mock fallback questions", err);
      }

      // Mock fallback questions
      const initialBatch = generateMockQuestions(category, 100).map(({ correct_option, explanation, reasoning_detail, source_article_url, ...rest }) => ({
        ...rest,
        date: selectedDate,
      })) as Question[];
      setAllDbQuestions(initialBatch);
      setQuestions(initialBatch.slice(0, 20));
      setUnlockedCount(20);
      setIsPaywallTriggered(false);
    }
    loadArchiveQuestions();
  }, [selectedDate, category]);

  const loadMoreQuestions = () => {
    if (isSubscribed) {
      if (unlockedCount < allDbQuestions.length) {
        const nextBatchSize = Math.min(allDbQuestions.length - unlockedCount, 20);
        const totalToUnlock = unlockedCount + nextBatchSize;
        setQuestions(allDbQuestions.slice(0, totalToUnlock));
        setUnlockedCount(totalToUnlock);
      }
    } else {
      setIsPaywallTriggered(true);
    }
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

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }

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
            setIsPaywallTriggered(false);
            // Immediately unlock full 100 questions
            const fullSet = generateMockQuestions(category, 100).map(({ correct_option, explanation, reasoning_detail, source_article_url, ...rest }) => ({
              ...rest,
              date: selectedDate || "2026-07-06",
            })) as Question[];
            setQuestions(fullSet);
            setUnlockedCount(100);
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Verifying Session...</p>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* Left column: Date Picker Panel (Col span 4) */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 h-fit space-y-6">
          <div className="glass-card rounded-2xl p-6 border border-slate-800/80">
            <h1 className="font-display font-black text-xl text-slate-100 mb-2 flex items-center gap-2">
              <History className="w-5 h-5 text-primary-400" />
              Syllabus Archives
            </h1>
            <p className="text-slate-400 text-xs leading-relaxed mb-6">
              Browse past daily sets and strengthen concepts you missed.
            </p>

            {/* Scrollable Date Selector */}
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {archiveDates.map((dateStr) => {
                const isSelected = selectedDate === dateStr;
                const [year, month, day] = dateStr.split("-").map(Number);
                const formattedDisplay = new Date(year, month - 1, day).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`w-full text-left p-3.5 rounded-xl border text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "bg-primary-500/10 border-primary-500/30 text-primary-400"
                        : "bg-slate-900/40 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900/80"
                    }`}
                  >
                    <span>{formattedDisplay}</span>
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-500 border border-slate-700/40">
                      100 MCQs
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right column: Questions display (Col span 8) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link
                href="/today"
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <h2 className="text-sm font-bold text-slate-200">
                  Archived Set:{" "}
                  {selectedDate && (() => {
                    const [year, month, day] = selectedDate.split("-").map(Number);
                    return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    });
                  })()}
                </h2>
                <p className="text-[11px] text-slate-500">
                  Historical {category === "rpsc" ? "RPSC State" : "UPSC Prelims"} Daily Digest
                </p>
              </div>
            </div>
          </div>

          {/* Render Questions */}
          <div className="space-y-6">
            {questions.map((q) => (
              <QuestionCard key={q.id} question={q} />
            ))}

            {isPaywallTriggered && (
              <div className="opacity-30 select-none pointer-events-none space-y-6">
                <QuestionCard
                  question={{
                    id: "locked-archived-1",
                    question_number: unlockedCount + 1,
                    subject_tag: "Polity",
                    question_text: "Consider the following statements regarding national boundaries...",
                    options: { A: "1 only", B: "2 only", C: "Both 1 & 2", D: "Neither 1 nor 2" },
                    correct_option: "C",
                    explanation: "Locked.",
                    reasoning_type: "syllabus",
                    reasoning_detail: "Syllabus mapping tag",
                    source_article_url: "#",
                    date: selectedDate || "2026-07-06",
                  }}
                  isBlurred={true}
                />
              </div>
            )}
          </div>

          {/* Lazy loader bottom checkpoint */}
          <div className="pt-4">
            {isPaywallTriggered ? (
              <PaywallOverlay
                categoryName={category === "upsc-prelims" ? "UPSC Prelims" : "RPSC"}
                onUnlock={handleSubscribe}
              />
            ) : unlockedCount < 100 ? (
              <div className="flex flex-col items-center justify-center p-8 bg-slate-900/20 border border-slate-900 rounded-2xl border-dashed">
                <p className="text-sm text-slate-400 mb-4">
                  Showing {unlockedCount} of 100 questions.
                </p>
                <button
                  onClick={loadMoreQuestions}
                  className="px-6 h-12 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-primary-400 text-xs font-bold rounded-xl transition-all cursor-pointer hover:scale-[1.01]"
                >
                  Load Next 20 Questions
                </button>
              </div>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center">
                <p className="text-sm font-bold text-emerald-400">
                  🎉 Completed Archival Study!
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  You have reviewed the entire set of 100 questions for this historical date.
                </p>
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
