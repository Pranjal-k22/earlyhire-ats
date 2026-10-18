import React from "react";
import { Sparkles, UserPlus, LogIn } from "lucide-react";

interface LandingFooterSectionProps {
  onOpenAuth: (mode: "login" | "signup") => void;
}

export const LandingFooterSection: React.FC<LandingFooterSectionProps> = ({ onOpenAuth }) => {
  const currentYear = new Date().getFullYear();

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer className="bg-[#030817] relative overflow-hidden border-t border-blue-500/10">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-gradient-to-b from-blue-600/15 via-indigo-600/10 to-transparent blur-[120px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-20 pb-12">
        {/* Pre-Footer Final CTA Card (Phase 8) */}
        <div className="p-8 sm:p-12 lg:p-16 rounded-3xl bg-gradient-to-r from-blue-950/80 via-[#07152F] to-slate-900/80 border border-blue-500/30 backdrop-blur-2xl shadow-2xl text-center space-y-6 max-w-5xl mx-auto relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-[80px] pointer-events-none rounded-full" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 blur-[80px] pointer-events-none rounded-full" />

          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-cyan-300 text-xs font-semibold tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>START HIRING SMARTER TODAY</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white max-w-2xl mx-auto">
              Make Your Next Hiring Decision More Informed
            </h2>

            <p className="text-base sm:text-lg text-slate-300 max-w-xl mx-auto leading-relaxed">
              Bring resumes, applications, and recruitment workflows into one connected workspace.
            </p>

            {/* Dual CTAs */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => onOpenAuth("signup")}
                className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-slate-950 bg-white hover:bg-slate-100 rounded-full shadow-xl shadow-cyan-500/20 hover:scale-103 transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-cyan-400"
              >
                <UserPlus className="w-4 h-4 text-blue-600" />
                <span>Get Started</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenAuth("login")}
                className="inline-flex items-center gap-2 px-7 py-3.5 text-base font-medium text-slate-200 hover:text-white bg-slate-900/60 hover:bg-slate-900 border border-slate-700/80 hover:border-cyan-400/40 rounded-full backdrop-blur-md transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-cyan-400"
              >
                <LogIn className="w-4 h-4 text-cyan-400" />
                <span>Sign In</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Navigation Columns */}
        <div className="mt-20 pt-12 border-t border-white/10 grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-md">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">EarlyAI ATS</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Intelligent decision-support platform connecting talented candidates with high-velocity hiring teams.
            </p>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-white uppercase tracking-wider">Product</div>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <a
                  href="#features"
                  onClick={(e) => handleSmoothScroll(e, "#features")}
                  className="hover:text-cyan-400 transition-colors"
                >
                  Features Overview
                </a>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  onClick={(e) => handleSmoothScroll(e, "#how-it-works")}
                  className="hover:text-cyan-400 transition-colors"
                >
                  How It Works
                </a>
              </li>
              <li>
                <a
                  href="#security"
                  onClick={(e) => handleSmoothScroll(e, "#security")}
                  className="hover:text-cyan-400 transition-colors"
                >
                  Security Architecture
                </a>
              </li>
            </ul>
          </div>

          {/* For Candidates Links */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-white uppercase tracking-wider">For Candidates</div>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <a
                  href="#candidates"
                  onClick={(e) => handleSmoothScroll(e, "#candidates")}
                  className="hover:text-cyan-400 transition-colors"
                >
                  Resume ATS Analysis
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenAuth("signup")}
                  className="hover:text-cyan-400 transition-colors text-left"
                >
                  Candidate Registration
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenAuth("login")}
                  className="hover:text-cyan-400 transition-colors text-left"
                >
                  Candidate Sign In
                </button>
              </li>
            </ul>
          </div>

          {/* For Hiring Teams Links */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-white uppercase tracking-wider">For Hiring Teams</div>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <a
                  href="#hiring-teams"
                  onClick={(e) => handleSmoothScroll(e, "#hiring-teams")}
                  className="hover:text-cyan-400 transition-colors"
                >
                  Pipeline & Kanban
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenAuth("login")}
                  className="hover:text-cyan-400 transition-colors text-left"
                >
                  Recruiter Sign In
                </button>
              </li>
              <li>
                <a
                  href="#security"
                  onClick={(e) => handleSmoothScroll(e, "#security")}
                  className="hover:text-cyan-400 transition-colors"
                >
                  Enterprise RBAC
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright & Disclaimer */}
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {currentYear} EarlyAI ATS. All rights reserved.</p>
          <p className="text-[11px] text-slate-500 text-center sm:text-right">
            Designed to support human hiring decisions • Secure local persistence
          </p>
        </div>
      </div>
    </footer>
  );
};
