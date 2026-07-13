import React from "react";
import { Lock, Sparkles, CheckCircle2, ShieldCheck } from "lucide-react";

interface PaywallOverlayProps {
  onUnlock?: () => void;
  categoryName: string;
}

export const PaywallOverlay: React.FC<PaywallOverlayProps> = ({ onUnlock, categoryName }) => {
  return (
    <div className="relative mt-[-100px] pt-[120px] pb-16 px-4 md:px-8 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent flex flex-col items-center justify-center text-center z-20">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-primary-500/10 blur-[80px]" />
      <div className="absolute top-1/3 left-1/3 w-48 h-48 rounded-full bg-emerald-500/5 blur-[60px]" />

      <div className="max-w-xl glass-card rounded-3xl p-8 md:p-10 border border-primary-500/20 glow-primary relative overflow-hidden">
        {/* Top Floating Badge */}
        <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-1 rotate-12 bg-amber-500 text-slate-950 text-[10px] font-extrabold px-6 py-1.5 uppercase tracking-wider flex items-center gap-1">
          <Sparkles className="w-3 h-3 fill-current" />
          Value Pack
        </div>

        {/* Locked Icon */}
        <div className="flex items-center justify-center bg-slate-900 border border-slate-800 w-16 h-16 rounded-2xl mx-auto mb-6 text-primary-400">
          <Lock className="w-8 h-8" />
        </div>

        <h2 className="font-display font-extrabold text-2xl md:text-3xl text-slate-100 leading-tight mb-4">
          You've seen today's value.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-emerald-400">
            Unlock all 100 questions.
          </span>
        </h2>

        <p className="text-slate-400 text-sm md:text-base leading-relaxed mb-6">
          Access the remaining questions for today's <span className="font-semibold text-slate-200">{categoryName}</span> daily set, complete with syllabus mapping, factual citations, and PYQ alignment tag checks.
        </p>

        {/* Benefits bullets */}
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto text-left mb-8">
          <li className="flex items-center gap-2.5 text-xs md:text-sm text-slate-300">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
            100 questions every morning
          </li>
          <li className="flex items-center gap-2.5 text-xs md:text-sm text-slate-300">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
            Full historical Archives
          </li>
          <li className="flex items-center gap-2.5 text-xs md:text-sm text-slate-300">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
            Double AI + Human Review
          </li>
          <li className="flex items-center gap-2.5 text-xs md:text-sm text-slate-300">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
            Bypass-proof server security
          </li>
        </ul>

        {/* Pricing & CTA */}
        <div className="flex flex-col items-center gap-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 mb-6">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold font-display text-slate-100">₹49</span>
            <span className="text-slate-400 text-sm">/ month</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-normal">
            No long term lock-ins. Cancel anytime from your account settings with a single click.
          </p>

          <button
            onClick={onUnlock}
            id="paywall-cta-button"
            className="w-full h-12 bg-gradient-to-r from-primary-600 to-emerald-600 hover:from-primary-500 hover:to-emerald-500 text-slate-950 font-bold rounded-xl transition-all duration-300 hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-primary-500/10"
          >
            <Sparkles className="w-4 h-4 fill-slate-950" />
            Subscribe Now — ₹49/mo
          </button>
        </div>

        {/* Safe Badge */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500/60" />
          Secured with Razorpay • Unlock is immediate without page reload
        </div>
      </div>
    </div>
  );
};
