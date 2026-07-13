"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { QuestionCard } from "@/components/QuestionCard";
import { PaywallOverlay } from "@/components/PaywallOverlay";
import { generateMockQuestions, Question } from "@/lib/mockData";
import { Calendar, Sparkles, Flame, CheckCircle, TrendingUp, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function TodayPage() {
  const [category, setCategory] = useState<"upsc-prelims" | "rpsc">("upsc-prelims");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [allDbQuestions, setAllDbQuestions] = useState<Question[]>([]);
  const [unlockedCount, setUnlockedCount] = useState<number>(20);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isPaywallTriggered, setIsPaywallTriggered] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const router = useRouter();

  // Protect the route and redirect unauthenticated users
  useEffect(() => {
    async function checkAuth() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.push("/");
      } else {
        // Fetch actual subscription profile from the 'users' table
        try {
          const { data: profile } = await supabase
            .from("users")
            .select("subscription_status, subscription_expiry")
            .eq("id", user.id)
            .maybeSingle();

          if (profile) {
            const isCurrentlySubscribed =
              profile.subscription_status === "active" &&
              (!profile.subscription_expiry || new Date(profile.subscription_expiry) > new Date());
            setIsSubscribed(isCurrentlySubscribed);
          }
        } catch (err) {
          console.error("Failed to fetch user subscription profile:", err);
        }
        setAuthLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  // Timer state for simulation
  const [secondsRemaining, setSecondsRemaining] = useState<number>(1800); // 30 minutes in seconds
  const [isTimerActive, setIsTimerActive] = useState<boolean>(true);

  // Load initial batch of 20 questions from database (with premium mock fallback)
  useEffect(() => {
    async function loadQuestions() {
      try {
        const res = await fetch("/api/questions");
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
        console.warn("⚠️ Questions API issue, loading mock fallback questions", err);
      }

      // Premium Mock Stream fallback
      const fallbackSet = generateMockQuestions("upsc-prelims", 100);
      setAllDbQuestions(fallbackSet);
      setQuestions(fallbackSet.slice(0, 20));
      setUnlockedCount(20);
      setIsPaywallTriggered(false);
    }

    loadQuestions();
  }, [category]);

  // Handle scroll to bottom to load more
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

  // Simulated 30-minute timer counting down
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerActive && secondsRemaining > 0 && !isSubscribed) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            setIsPaywallTriggered(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerActive, secondsRemaining, isSubscribed]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
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
            // Immediately unlock full questions set from live database
            setQuestions(allDbQuestions);
            setUnlockedCount(allDbQuestions.length);
          } else {
            const errData = await verifyRes.json();
            alert(errData.error || "Payment verification failed. Please reach out to support.");
          }
        },
        prefill: {
          name: user.user_metadata?.name || user.user_metadata?.full_name || "",
          email: user.email || "",
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

  const triggerInstantExpiry = () => {
    setSecondsRemaining(0);
    setIsPaywallTriggered(true);
  };

  const resetTimer = () => {
    setSecondsRemaining(1800);
    setIsPaywallTriggered(false);
    setQuestions(allDbQuestions.slice(0, 20));
    setUnlockedCount(Math.min(20, allDbQuestions.length));
  };

  const getSyllabusBreakdown = () => {
    const list = allDbQuestions.length > 0 ? allDbQuestions : questions;
    if (list.length === 0) {
      return [
        { label: "Polity & Governance", percentage: 25, color: "bg-indigo-500" },
        { label: "Economic Development", percentage: 25, color: "bg-amber-500" },
        { label: "Ecology & Biodiversity", percentage: 25, color: "bg-teal-500" },
        { label: "Science & Technology", percentage: 25, color: "bg-purple-500" },
      ];
    }

    const counts: { [key: string]: number } = {};
    for (const q of list) {
      const tag = q.subject_tag || "General";
      counts[tag] = (counts[tag] || 0) + 1;
    }

    const total = list.length;
    const categories = [
      { key: "Polity", label: "Polity & Governance", color: "bg-indigo-500" },
      { key: "Economy", label: "Economic Development", color: "bg-amber-500" },
      { key: "Environment", label: "Ecology & Biodiversity", color: "bg-teal-500" },
      { key: "Science", label: "Science & Technology", color: "bg-purple-500" },
      { key: "Geography", label: "Geography & Mapping", color: "bg-rose-500" },
      { key: "International Relations", label: "International Relations", color: "bg-cyan-500" },
    ];

    const results = [];
    let accountedCount = 0;

    for (const cat of categories) {
      let count = 0;
      for (const tag of Object.keys(counts)) {
        if (tag.toLowerCase().includes(cat.key.toLowerCase())) {
          count += counts[tag];
        }
      }
      accountedCount += count;
      if (count > 0) {
        results.push({
          label: cat.label,
          percentage: Math.round((count / total) * 100),
          color: cat.color,
        });
      }
    }

    const remaining = total - accountedCount;
    if (remaining > 0 && results.length < 5) {
      results.push({
        label: "General & Current Events",
        percentage: Math.round((remaining / total) * 100),
        color: "bg-slate-500",
      });
    }

    return results.sort((a, b) => b.percentage - a.percentage);
  };

  // -------------------------------------------------------------
  // Dynamic Live Metadata Helpers (Zero Hardcoding!)
  // -------------------------------------------------------------
  const latestDateStr = allDbQuestions.length > 0 ? allDbQuestions[0].date : "2026-07-11";

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return "July 11th, 2026";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return "July 11th, 2026";
    const year = parts[0];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const dayNum = parseInt(parts[2], 10);
    
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const monthName = months[monthIdx] || "July";
    
    let dayWithSuffix = String(dayNum);
    if (dayNum >= 11 && dayNum <= 13) {
      dayWithSuffix += "th";
    } else {
      switch (dayNum % 10) {
        case 1: dayWithSuffix += "st"; break;
        case 2: dayWithSuffix += "nd"; break;
        case 3: dayWithSuffix += "rd"; break;
        default: dayWithSuffix += "th"; break;
      }
    }
    
    return `${monthName} ${dayWithSuffix}, ${year}`;
  };

  const displayDate = formatDisplayDate(latestDateStr);

  const getDynamicTopics = () => {
    if (allDbQuestions.length === 0) {
      return "Digital Rupee, ISRO's CMS-03 launch, Election Commission reforms";
    }
    const topics: string[] = [];
    const regex = /With reference to (?:the\s+)?([^,]+),/i;
    for (const q of allDbQuestions) {
      if (topics.length >= 3) break;
      const match = q.question_text.match(regex);
      if (match && match[1]) {
        const parsedTopic = match[1].trim();
        const formatted = parsedTopic.charAt(0).toUpperCase() + parsedTopic.slice(1);
        if (!topics.includes(formatted) && formatted.length < 50) {
          topics.push(formatted);
        }
      }
    }
    if (topics.length > 0) {
      const remainingCount = allDbQuestions.length - topics.length;
      return topics.join(", ") + (remainingCount > 0 ? ` +${remainingCount} more` : "");
    }
    return "Current Affairs, Static Syllabus, GS Paper 1 Mapping";
  };

  const getDynamicSummary = () => {
    if (allDbQuestions.length === 0) {
      return category === "upsc-prelims"
        ? "Digital Rupee ledger expansion, Amur Falcon annual migration routes, DSOC deep-space optical communication records, Article 356 emergency rule thresholds."
        : "Rajasthan State Flagship budget models, Vijay Stambha landmarks, IGNP water-basin irrigation maps, and administrative subdivisions.";
    }
    const summaryTopics: string[] = [];
    const regex = /With reference to (?:the\s+)?([^,]+),/i;
    for (const q of allDbQuestions) {
      if (summaryTopics.length >= 4) break;
      const match = q.question_text.match(regex);
      if (match && match[1]) {
        const parsedTopic = match[1].trim();
        const formatted = parsedTopic.charAt(0).toUpperCase() + parsedTopic.slice(1);
        if (!summaryTopics.includes(formatted) && formatted.length < 50) {
          summaryTopics.push(formatted);
        }
      }
    }
    return summaryTopics.join(", ") + ".";
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
      {/* Top Navigation */}
      <Navbar
        currentCategory={category}
        onCategoryChange={setCategory}
        isSubscribed={isSubscribed}
      />

      {/* Main Layout Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* Left Side: Summary Panel, Stats & Simulations (Col span 4) */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 h-fit space-y-6">
          
          {/* Greeting Box */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800/80">
            <span className="text-xs font-bold text-primary-400 uppercase tracking-wider bg-primary-500/10 border border-primary-500/20 px-2.5 py-1 rounded-md inline-block mb-4 animate-pulse">
              DAILY PRACTICE READY
            </span>
            <h1 className="font-display font-black text-2xl text-slate-100 mb-3">
              Today's Practice Set
            </h1>
            <p className="text-slate-400 text-xs leading-relaxed mb-4">
              100 fresh questions from {displayDate} news - mapped to GS Papers 1, checked against 25 years of past papers.
            </p>
            
            <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl mb-5">
              <p className="text-[11px] text-slate-400 leading-normal">
                <span className="font-semibold text-slate-200">Today:</span> {getDynamicTopics()}
              </p>
            </div>

            <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between text-xs font-bold text-slate-400">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Calendar className="w-4 h-4 text-primary-400" />
                {displayDate}
              </span>
              <span className="text-primary-400">100 Questions</span>
            </div>
          </div>

          {/* Stats Box */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800/80">
            <h3 className="font-display font-bold text-sm text-slate-200 mb-4 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Syllabus Coverage Breakdown
            </h3>
            
            <div className="space-y-3">
              {getSyllabusBreakdown().map((cat) => (
                <div key={cat.label}>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{cat.label}</span>
                    <span className="font-bold text-slate-200">{cat.percentage}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ease-out ${cat.color}`} 
                      style={{ width: `${cat.percentage}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Scrollable Feed of 100 Questions (Col span 8) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Daily Header Summary */}
          <div className="p-4 bg-slate-900/30 border border-slate-900 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-primary-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400 leading-normal">
              <span className="font-semibold text-slate-200">Today's Topic Summary:</span>{" "}
              {getDynamicSummary()}
            </p>
          </div>

          {/* Question List */}
          <div className="space-y-6">
            {questions.map((q) => (
              <QuestionCard key={q.id} question={q} />
            ))}

            {/* Blurred Mock Cards for visual aesthetic of remaining locked scroll area */}
            {isPaywallTriggered && (
              <div className="space-y-6 opacity-30 select-none pointer-events-none">
                <QuestionCard
                  question={{
                    id: "locked-1",
                    question_number: unlockedCount + 1,
                    subject_tag: "Polity",
                    question_text: "Which of the following bodies is constitutional in nature?\n1. National Commission for Scheduled Tribes\n2. National Commission for Minorities\n3. GST Council",
                    options: { A: "1 only", B: "1 and 3 only", C: "2 and 3 only", D: "1, 2 and 3" },
                    correct_option: "B",
                    explanation: "Locked concept.",
                    reasoning_type: "syllabus",
                    reasoning_detail: "Syllabus mapping placeholder",
                    source_article_url: "#",
                    date: "2026-07-07",
                  }}
                  isBlurred={true}
                />
              </div>
            )}
          </div>

          {/* Lazy Load Trigger or Paywall Overlay */}
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
                  🎉 Completed Today's Set!
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  You have digested all 100 questions for {displayDate}. Come back tomorrow at 9:00 AM IST.
                </p>
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}

