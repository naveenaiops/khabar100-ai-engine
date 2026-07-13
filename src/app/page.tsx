"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, CheckCircle2, ChevronRight, Play, Flame, Shield, TrendingUp, AlertCircle, ArrowRight, Newspaper, RefreshCw, PenTool, ShieldCheck } from "lucide-react";
import { QuestionCard } from "@/components/QuestionCard";
import { MOCK_UPSC_QUESTIONS, MOCK_RPSC_QUESTIONS } from "@/lib/mockData";
import { supabase } from "@/lib/supabase/client";

export default function Home() {
  const activeCategory = "upsc";
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    }
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (e: React.MouseEvent) => {
    e.preventDefault(); // Stop any default navigation
    e.stopPropagation(); // Stop event bubbling

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/auth/callback",
      },
    });
    if (error) console.error("Auth error:", error.message);
  };

  const sampleQuestions = MOCK_UPSC_QUESTIONS.slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-primary-500/30 selection:text-slate-100">
      {/* Background Decorative Blur Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-40 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Header / Navbar */}
      <header className="border-b border-slate-900 bg-slate-950/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-emerald-500 flex items-center justify-center text-slate-950">
              <Newspaper className="w-5 h-5" />
            </div>
            <span className="font-display font-black text-xl tracking-tight text-slate-100">
              Khabar<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-emerald-400">100</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            {loading ? (
              <div className="w-16 h-8 bg-slate-900 animate-pulse rounded-xl" />
            ) : user ? (
              <>
                <Link
                  href="/today"
                  className="text-sm font-semibold text-slate-400 hover:text-slate-100 transition-colors"
                >
                  Practice Feed
                </Link>
                <Link
                  href="/account"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-100 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  My Account
                </Link>
              </>
            ) : (
              <button
                type="button"
                onClick={handleLogin}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-100 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Log In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 md:py-32 overflow-hidden px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Top Pill Announcement */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/25 text-xs text-primary-400 font-bold mb-8 animate-fade-in animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            Designed Exclusively for UPSC Prelims GS1 Aspirants
          </div>

          <h1 className="font-display font-black text-4xl sm:text-6xl md:text-7xl leading-tight text-slate-100 tracking-tight max-w-4xl mx-auto mb-6">
            Turn Today's Newspaper Into <span className="text-emerald-400">100</span> Exam-Ready Questions.
          </h1>

          <p className="text-slate-400 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed mb-10">
            Stop guessing which news matters. We read every article, cross-check 25 years of past papers, and hand you exactly what's testable, maps it to your syllabus, and every question is checked by a real reviewer before it reaches you.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-12">
            {loading ? (
              <div className="w-48 h-14 bg-slate-900 animate-pulse rounded-2xl" />
            ) : user ? (
              <Link
                href="/today"
                id="hero-cta-button"
                className="w-full sm:w-auto h-14 px-8 bg-gradient-to-r from-primary-600 to-emerald-600 hover:from-primary-500 hover:to-emerald-500 text-slate-950 font-extrabold rounded-2xl transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-primary-500/10"
              >
                Go to Practice Feed
                <ArrowRight className="w-5 h-5 text-slate-950" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleLogin}
                id="hero-cta-button"
                className="w-full sm:w-auto h-14 px-8 bg-gradient-to-r from-primary-600 to-emerald-600 hover:from-primary-500 hover:to-emerald-500 text-slate-950 font-extrabold rounded-2xl transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-primary-500/10"
              >
                Start Free Practice
                <ArrowRight className="w-5 h-5 text-slate-950" />
              </button>
            )}
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              ⚡ No credit card needed
            </span>
          </div>

          {/* Quick trust metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto border-t border-slate-900 pt-8 mt-4 text-center">
            <div>
              <p className="text-2xl font-extrabold font-display text-slate-100">100</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Daily Questions</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold font-display text-emerald-400">100%</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Syllabus-Mapped</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold font-display text-amber-400">100%</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Human Verified</p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Sample Questions Section */}
      <section className="py-16 bg-slate-900/30 border-y border-slate-900 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display font-black text-2xl sm:text-4xl text-slate-100 mb-4">
              Inspect Live Sample Questions
            </h2>
            <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
              Toggle between categories and see exactly how questions are presented. Answers are fully visible directly for deep comprehension and speed digest.
            </p>

            {/* Category locked selection */}
            <div className="flex justify-center mt-6 select-none">
              <div className="bg-slate-950 border border-slate-800 p-2 rounded-2xl">
                <span className="px-5 py-2 rounded-xl text-sm font-black text-primary-400 bg-slate-900 border border-slate-800/80">
                  UPSC CSE GS1 Practice Set
                </span>
              </div>
            </div>
          </div>

          {/* Render Sample Cards */}
          <div className="space-y-6">
            {sampleQuestions.map((q) => (
              <QuestionCard key={q.id} question={q} showExplanationUpfront={true} />
            ))}
          </div>

          <div className="text-center mt-10">
            {loading ? (
              <div className="w-48 h-6 bg-slate-900 animate-pulse rounded-md mx-auto" />
            ) : user ? (
              <Link
                href="/today"
                className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 font-bold transition-all group"
              >
                Practice today's complete set of 100 questions
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleLogin}
                className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 font-bold transition-all group cursor-pointer"
              >
                Sign in to practice today's complete set of 100 questions
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* The Concept / Philosophy Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-card rounded-2xl p-6 border border-slate-800/80 hover:border-slate-700/80 transition-all duration-300 group">
              <div className="w-14 h-14 p-4 rounded-2xl mb-5 flex items-center justify-center bg-slate-900/60 border border-primary-500/20 text-primary-400 shadow-lg shadow-primary-500/5 backdrop-blur-sm group-hover:scale-105 transition-transform duration-300">
                <RefreshCw className="w-5 h-5 animate-[spin_12s_linear_infinite]" />
              </div>
              <h3 className="font-display font-bold text-lg text-slate-100 mb-2">
                PYQ Alignment Checks
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Using vector embeddings, every news fact is cross-referenced with 25+ years of past papers. Instantly spot repeats, similar concepts, or brand-new syllabus highlights.
              </p>
            </div>

            <div className="glass-card rounded-2xl p-6 border border-slate-800/80 hover:border-slate-700/80 transition-all duration-300 group">
              <div className="w-14 h-14 p-4 rounded-2xl mb-5 flex items-center justify-center bg-slate-900/60 border border-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/5 backdrop-blur-sm group-hover:scale-105 transition-transform duration-300">
                <PenTool className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-lg text-slate-100 mb-2">
                Active Recall Practice
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Learn dynamically with interactive answer validation. Select your choices to instantly trigger feedback, view expert explanations, and lock in concepts through active recall.
              </p>
            </div>

            <div className="glass-card rounded-2xl p-6 border border-slate-800/80 hover:border-slate-700/80 transition-all duration-300 group">
              <div className="w-14 h-14 p-4 rounded-2xl mb-5 flex items-center justify-center bg-slate-900/60 border border-amber-500/20 text-amber-400 shadow-lg shadow-amber-500/5 backdrop-blur-sm group-hover:scale-105 transition-transform duration-300">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-lg text-slate-100 mb-2">
                Human-Expert Review
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                AI generates, but experienced administrators edit and review every question card before they publish. AI-Assisted. Human-Reviewed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing / CTA Card */}
      <section className="py-16 bg-slate-900/10 border-t border-slate-900 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto glass-card rounded-3xl p-8 md:p-12 border border-slate-800/80 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-16 translate-y-4 rotate-45 bg-emerald-500 text-slate-950 text-[10px] font-extrabold px-12 py-1 uppercase tracking-wider">
            Best Offer
          </div>

          <span className="text-xs font-bold text-primary-400 uppercase tracking-widest bg-primary-500/10 border border-primary-500/20 px-3 py-1 rounded-full mb-4 inline-block">
            Simple Unlimited Plan
          </span>

          <h2 className="font-display font-black text-3xl sm:text-5xl text-slate-100 leading-tight mb-4">
            One Price. Everything Unlocked.
          </h2>

          <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl mx-auto mb-8">
            Access today's 100-question set and the entire growing Archive for both UPSC and RPSC. No complex tiers. No hidden charges.
          </p>

          <div className="flex items-baseline justify-center gap-1.5 mb-8">
            <span className="text-5xl font-black font-display text-slate-100">₹49</span>
            <span className="text-slate-500 text-base font-semibold">/ month</span>
          </div>

          <div className="space-y-3 max-w-md mx-auto mb-8 text-left border-y border-slate-800/60 py-6">
            <div className="flex items-center gap-3 text-slate-300 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              100 brand-new syllabus questions daily
            </div>
            <div className="flex items-center gap-3 text-slate-300 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              Full unlimited archive history date-picker
            </div>
            <div className="flex items-center gap-3 text-slate-300 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              Syllabus-mapped questions updated daily
            </div>
            <div className="flex items-center gap-3 text-slate-300 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              Premium, responsive interface with dark mode
            </div>
          </div>

          {loading ? (
            <div className="w-full max-w-sm h-14 bg-slate-900 animate-pulse rounded-2xl mx-auto" />
          ) : user ? (
            <Link
              href="/today"
              id="pricing-cta-button"
              className="w-full max-w-sm h-14 bg-gradient-to-r from-primary-600 to-emerald-600 hover:from-primary-500 hover:to-emerald-500 text-slate-950 font-extrabold text-base rounded-2xl transition-all duration-300 hover:scale-[1.01] inline-flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-primary-500/10"
            >
              Go to Practice Feed
              <ChevronRight className="w-5 h-5 text-slate-950" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleLogin}
              id="pricing-cta-button"
              className="w-full max-w-sm h-14 bg-gradient-to-r from-primary-600 to-emerald-600 hover:from-primary-500 hover:to-emerald-500 text-slate-950 font-extrabold text-base rounded-2xl transition-all duration-300 hover:scale-[1.01] inline-flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-primary-500/10"
            >
              Start Free Practice Now
              <ChevronRight className="w-5 h-5 text-slate-950" />
            </button>
          )}

          <p className="text-[11px] text-slate-500 mt-4">
            Immediate access. Cancel in one click with no hassle.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-slate-500 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-slate-900 flex items-center justify-center text-slate-400">
              <Newspaper className="w-3.5 h-3.5" />
            </div>
            <span className="font-display font-black text-slate-400">
              Khabar100 © 2026
            </span>
          </div>

          <p className="text-center md:text-right">
            Designed for serious aspirants.
          </p>
        </div>
      </footer>
    </div>
  );
}
