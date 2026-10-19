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
    <footer className="bg-[#FAF8FF] relative overflow-hidden border-t border-[#EAE5F0]">
      {/* Background pastel glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-gradient-to-b from-[#EEE8FF]/70 via-[#F8DDEA]/40 to-transparent blur-[120px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-20 pb-12">
        {/* Pre-Footer Final CTA Card */}
        <div className="p-8 sm:p-12 lg:p-16 rounded-3xl bg-gradient-to-r from-[#EEE8FF]/90 via-[#FCEFF5]/90 to-[#E6EDFF]/90 border border-[#E0D5F5] shadow-xl text-center space-y-6 max-w-5xl mx-auto relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-[#DDD4F8] text-[#7651E8] text-xs font-semibold tracking-wider uppercase shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#7651E8]" />
              <span>START HIRING SMARTER TODAY</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#20202A] max-w-2xl mx-auto">
              Make Your Next Hiring Decision More Informed
            </h2>

            <p className="text-base sm:text-lg text-[#696977] max-w-xl mx-auto leading-relaxed">
              Bring resumes, applications, and recruitment workflows into one connected workspace.
            </p>

            {/* Dual CTAs */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => onOpenAuth("signup")}
                className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-bold text-slate-950 bg-[#FFAA45] hover:bg-[#F59218] rounded-full shadow-lg shadow-amber-500/20 hover:scale-103 transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-amber-400 cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-slate-950" />
                <span>Get Started</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenAuth("login")}
                className="inline-flex items-center gap-2 px-7 py-3.5 text-base font-semibold text-[#20202A] hover:text-[#7651E8] bg-white hover:bg-slate-50 border border-[#EAE5F0] hover:border-[#A78BFA] rounded-full shadow-xs transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-purple-400 cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-[#7651E8]" />
                <span>Sign In</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Navigation Columns */}
        <div className="mt-20 pt-12 border-t border-[#EAE5F0] grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#7651E8] to-[#9333EA] flex items-center justify-center text-white shadow-xs">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-[#20202A] tracking-tight">EarlyAI ATS</span>
            </div>
            <p className="text-xs text-[#696977] leading-relaxed">
              Intelligent decision-support platform connecting talented candidates with high-velocity hiring teams.
            </p>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-[#20202A] uppercase tracking-wider">Product</div>
            <ul className="space-y-2 text-xs text-[#696977]">
              <li>
                <a
                  href="#features"
                  onClick={(e) => handleSmoothScroll(e, "#features")}
                  className="hover:text-[#7651E8] transition-colors"
                >
                  Features Overview
                </a>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  onClick={(e) => handleSmoothScroll(e, "#how-it-works")}
                  className="hover:text-[#7651E8] transition-colors"
                >
                  How It Works
                </a>
              </li>
              <li>
                <a
                  href="#security"
                  onClick={(e) => handleSmoothScroll(e, "#security")}
                  className="hover:text-[#7651E8] transition-colors"
                >
                  Security Architecture
                </a>
              </li>
            </ul>
          </div>

          {/* For Candidates Links */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-[#20202A] uppercase tracking-wider">For Candidates</div>
            <ul className="space-y-2 text-xs text-[#696977]">
              <li>
                <a
                  href="#candidates"
                  onClick={(e) => handleSmoothScroll(e, "#candidates")}
                  className="hover:text-[#7651E8] transition-colors"
                >
                  Resume ATS Analysis
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenAuth("signup")}
                  className="hover:text-[#7651E8] transition-colors text-left cursor-pointer"
                >
                  Candidate Registration
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenAuth("login")}
                  className="hover:text-[#7651E8] transition-colors text-left cursor-pointer"
                >
                  Candidate Sign In
                </button>
              </li>
            </ul>
          </div>

          {/* For Hiring Teams Links */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-[#20202A] uppercase tracking-wider">For Hiring Teams</div>
            <ul className="space-y-2 text-xs text-[#696977]">
              <li>
                <a
                  href="#hiring-teams"
                  onClick={(e) => handleSmoothScroll(e, "#hiring-teams")}
                  className="hover:text-[#7651E8] transition-colors"
                >
                  Pipeline & Kanban
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenAuth("login")}
                  className="hover:text-[#7651E8] transition-colors text-left cursor-pointer"
                >
                  Recruiter Sign In
                </button>
              </li>
              <li>
                <a
                  href="#security"
                  onClick={(e) => handleSmoothScroll(e, "#security")}
                  className="hover:text-[#7651E8] transition-colors"
                >
                  Enterprise RBAC
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright & Disclaimer */}
        <div className="mt-12 pt-8 border-t border-[#EAE5F0] flex flex-col sm:flex-row items-center justify-between text-xs text-[#696977] gap-4">
          <p>© {currentYear} EarlyAI ATS. All rights reserved.</p>
          <p className="text-[11px] text-[#696977] text-center sm:text-right">
            Designed to support human hiring decisions • Secure local persistence
          </p>
        </div>
      </div>
    </footer>
  );
};
