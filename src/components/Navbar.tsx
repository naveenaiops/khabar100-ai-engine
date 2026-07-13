import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Calendar, History, User, Flame, Award, Newspaper } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface NavbarProps {
  currentCategory: "upsc-prelims" | "rpsc";
  onCategoryChange: (category: "upsc-prelims" | "rpsc") => void;
  isSubscribed?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentCategory,
  onCategoryChange,
  isSubscribed = false,
}) => {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    }
    checkUser();

    // Set up state listener to respond dynamically to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const isLinkActive = (path: string) => {
    return pathname === path;
  };

  const getFirstName = () => {
    if (!user) return "";
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "";
    if (fullName) {
      return fullName.split(" ")[0];
    }
    return user.email?.split("@")[0] || "Aspirant";
  };

  const getInitials = () => {
    const name = getFirstName();
    return name ? name[0].toUpperCase() : "A";
  };

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

  const renderAccountLink = () => {
    if (loading) {
      return (
        <div className="p-2 rounded-lg flex items-center gap-1.5 text-xs font-bold text-slate-500 animate-pulse bg-slate-900/20 select-none min-w-[70px]">
          <User className="w-4 h-4 opacity-50" />
          <span className="hidden sm:inline">Log In</span>
        </div>
      );
    }

    if (user) {
      const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
      return (
        <Link
          href="/account"
          className={`p-2 rounded-lg transition-all duration-200 flex items-center gap-1.5 text-xs font-bold shrink-0 ${
            isLinkActive("/account")
              ? "bg-slate-900 text-primary-400"
              : "text-slate-400 hover:text-white hover:bg-slate-900/50"
          }`}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile Avatar"
              className="w-5 h-5 rounded-full object-cover border border-slate-800 shrink-0"
            />
          ) : (
            <span className="w-5 h-5 rounded-full bg-gradient-to-br from-primary-400 to-emerald-400 text-slate-950 flex items-center justify-center text-[10px] font-black shrink-0">
              {getInitials()}
            </span>
          )}
          <span className="hidden sm:inline ml-1.5">
            {getFirstName()}
          </span>
        </Link>
      );
    }

    return (
      <button
        type="button"
        onClick={handleLogin}
        className="p-2 rounded-lg transition-all duration-200 flex items-center gap-1.5 text-xs font-bold shrink-0 text-slate-400 hover:text-white hover:bg-slate-900/50 cursor-pointer"
      >
        <User className="w-4 h-4" />
        <span className="hidden sm:inline">Log In</span>
      </button>
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-emerald-500 flex items-center justify-center text-slate-950 shadow-md group-hover:scale-105 transition-transform">
              <Newspaper className="w-5 h-5" />
            </div>
            <span className="font-display font-black text-xl tracking-tight text-slate-100">
              Khabar<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-emerald-400">100</span>
            </span>
          </Link>
          
          {isSubscribed && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-2 py-0.5 rounded uppercase">
              PRO
            </span>
          )}
        </div>

        {/* Center: Category Locked Display (RPSC Completely Removed) */}
        <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-xl shrink-0 select-none">
          <span className="px-4 py-1 text-xs font-black uppercase text-primary-400 bg-slate-800 shadow-sm border border-slate-700/50 rounded-lg">
            UPSC CSE GS1
          </span>
        </div>

        {/* Right Section: Core Navigation & Stats */}
        <div className="flex items-center gap-4">

          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/today"
              className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold ${
                isLinkActive("/today")
                  ? "bg-slate-900 text-primary-400"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Today's Set</span>
            </Link>

            <Link
              href="/archive"
              className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold ${
                isLinkActive("/archive")
                  ? "bg-slate-900 text-primary-400"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
              }`}
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Archive</span>
            </Link>

            {renderAccountLink()}
          </nav>
        </div>
      </div>
    </header>
  );
};
