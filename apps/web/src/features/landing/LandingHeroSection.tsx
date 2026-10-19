import React, { useState } from "react";
import {
  ArrowRight,
  FileText,
  CheckCircle2,
  Compass,
  Check,
  Activity,
  Sparkles,
} from "lucide-react";

interface LandingHeroSectionProps {
  onOpenAuth: (mode: "login" | "signup") => void;
  onExploreFeatures: () => void;
}

export const LandingHeroSection: React.FC<LandingHeroSectionProps> = ({
  onOpenAuth,
  onExploreFeatures,
}) => {
  const [imageError, setImageError] = useState(false);

  return (
    <section className="relative min-h-[92vh] pt-32 pb-20 overflow-hidden flex items-center bg-[#FAF8FF]">
      {/* Background Radial Glow & Atmosphere (Light Pastel Inspired by Reference) */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[550px] bg-gradient-to-tr from-[#EEE8FF]/70 via-[#F8DDEA]/50 to-[#DDEEFF]/40 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute top-10 right-10 w-[500px] h-[500px] bg-[#FFD7BD]/30 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-[#EEE8FF]/60 blur-[120px] pointer-events-none rounded-full" />

      {/* Subtle Star Grid Background */}
      <div
        className="absolute inset-0 opacity-[0.25] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(118, 81, 232, 0.2) 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Side: Product Messaging & Editorial Hero */}
          <div className="lg:col-span-6 xl:col-span-7 flex flex-col items-start text-left space-y-6">
            {/* Small uppercase eyebrow badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EEE8FF] border border-[#DDD4F8] text-[#7651E8] text-xs font-semibold tracking-wider uppercase shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#7651E8] animate-ping" />
              <span>AI-POWERED RECRUITMENT PLATFORM</span>
            </div>

            {/* Editorial Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-light tracking-tight text-[#20202A] leading-[1.08] font-sans">
              Find Better Matches. <br />
              <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#7651E8] via-[#9333EA] to-[#EC4899]">
                Build Better Teams.
              </span>
            </h1>

            {/* Supporting Description */}
            <p className="text-lg sm:text-xl text-[#696977] font-normal max-w-xl leading-relaxed">
              Turn resumes into actionable insights, connect candidates with the right opportunities,
              and manage the hiring journey in one intelligent recruitment workspace.
            </p>

            {/* Dual Call-to-Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              {/* Primary CTA in Warm Orange */}
              <button
                type="button"
                onClick={() => onOpenAuth("signup")}
                className="relative group inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-bold text-slate-950 bg-[#FFAA45] hover:bg-[#F59218] rounded-full shadow-lg shadow-amber-500/25 transition-all duration-200 hover:scale-103 focus:outline-hidden focus:ring-2 focus:ring-amber-400"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4 text-slate-950 transition-transform group-hover:translate-x-1" />
              </button>

              {/* Secondary CTA */}
              <button
                type="button"
                onClick={onExploreFeatures}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-semibold text-[#20202A] hover:text-[#7651E8] bg-white hover:bg-slate-50 border border-[#EAE5F0] hover:border-[#A78BFA] rounded-full shadow-xs transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-purple-400"
              >
                <Compass className="w-4 h-4 text-[#7651E8]" />
                <span>Explore Features</span>
              </button>
            </div>

            {/* Supporting Micro-Statement */}
            <p className="text-xs text-[#696977] font-medium tracking-wide">
              One connected workspace for candidates and hiring teams.
            </p>

            {/* Lower Hero Collaboration Visuals */}
            <div className="pt-6 sm:pt-8 w-full max-w-md">
              <div className="p-4 rounded-2xl bg-white/90 border border-[#EAE5F0] shadow-sm backdrop-blur-md flex items-center justify-between gap-4">
                {/* Connected User Avatars */}
                <div className="flex items-center">
                  <div className="flex -space-x-2.5 overflow-hidden">
                    <div className="inline-block h-9 w-9 rounded-full ring-2 ring-white bg-gradient-to-tr from-[#7651E8] to-[#9333EA] flex items-center justify-center text-xs font-bold text-white shadow-xs">
                      PS
                    </div>
                    <div className="inline-block h-9 w-9 rounded-full ring-2 ring-white bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-xs">
                      ER
                    </div>
                    <div className="inline-block h-9 w-9 rounded-full ring-2 ring-white bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-xs font-bold text-white shadow-xs">
                      AK
                    </div>
                    <div className="inline-block h-9 w-9 rounded-full ring-2 ring-white bg-purple-100 flex items-center justify-center text-[10px] font-bold text-[#7651E8]">
                      +12
                    </div>
                  </div>
                </div>

                {/* Floating Invite Widget */}
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1 rounded-full bg-emerald-50 text-[11px] font-semibold text-emerald-800 flex items-center gap-1.5 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Talent meets opportunity</span>
                  </div>
                  <div className="text-[10px] font-bold text-[#7651E8] uppercase tracking-wider hidden sm:block">
                    Seamless Collaboration+
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Signature Visual & Floating Recruitment UI Panels */}
          <div className="lg:col-span-6 xl:col-span-5 relative flex items-center justify-center min-h-[460px] sm:min-h-[540px]">
            {/* Large Rounded Container with Soft Gradient Frame */}
            <div className="relative w-full max-w-[480px] p-3.5 rounded-3xl bg-gradient-to-br from-[#EEE8FF] via-[#FCEFF5] to-[#E6EDFF] border border-[#E8E0F5] shadow-xl">
              {/* Photo Container */}
              <div className="relative w-full aspect-4/3 sm:aspect-1/1 rounded-2xl overflow-hidden bg-white shadow-inner">
                {!imageError ? (
                  <img
                    src="/hero-recruiter.jpg"
                    alt="EarlyAI ATS Recruiter Workspace Professional"
                    onError={() => setImageError(true)}
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-[#EEE8FF] via-[#FDE8F1] to-[#E0F2FE] flex items-center justify-center p-8 text-center">
                    <div className="space-y-3">
                      <div className="w-16 h-16 rounded-2xl bg-white shadow-md mx-auto flex items-center justify-center text-[#7651E8]">
                        <Sparkles className="w-8 h-8" />
                      </div>
                      <div className="text-sm font-bold text-[#20202A]">EarlyAI ATS Talent Workspace</div>
                      <div className="text-xs text-[#696977]">Connecting Candidates & Hiring Teams</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Floating Panel 1: Candidate Match Card (Top-Left) */}
              <div className="absolute -top-5 -left-4 sm:-left-6 z-20 w-64 p-3.5 rounded-2xl bg-white/95 border border-[#EAE5F0] backdrop-blur-xl shadow-xl animate-float-slow">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#7651E8] to-[#9333EA] flex items-center justify-center text-white text-xs font-bold shadow-xs">
                      PS
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#20202A]">Priya Sharma</div>
                      <div className="text-[10px] text-[#696977]">Full-Stack Engineer</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1 shadow-xs">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>94%</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-purple-50 text-[#7651E8] border border-purple-200 font-medium">
                    React
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-purple-50 text-[#7651E8] border border-purple-200 font-medium">
                    TypeScript
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-purple-50 text-[#7651E8] border border-purple-200 font-medium">
                    Node.js
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                    Docker
                  </span>
                </div>
              </div>

              {/* Floating Panel 2: Resume Analysis Card (Bottom-Right) */}
              <div className="absolute -bottom-5 -right-3 sm:-right-6 z-20 w-72 p-3.5 rounded-2xl bg-white/95 border border-[#EAE5F0] backdrop-blur-xl shadow-xl animate-float-reverse">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-[#7651E8]">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-[#20202A] truncate">
                      priya_sharma_resume.pdf
                    </div>
                    <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>ATS Analysis Complete</span>
                    </div>
                  </div>
                </div>
                {/* Score Breakdown Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[10px] font-semibold text-[#696977]">
                    <span>Skills Match</span>
                    <span className="text-[#7651E8] font-bold">96%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#7651E8] via-[#9333EA] to-[#EC4899] rounded-full"
                      style={{ width: "96%" }}
                    />
                  </div>
                </div>
              </div>

              {/* Floating Panel 3: Pipeline Stage Progress Pill (Bottom-Left) */}
              <div className="absolute top-2/3 -left-3 sm:-left-8 z-20 px-3 py-2 rounded-xl bg-white border border-[#EAE5F0] shadow-lg flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#7651E8]" />
                <div className="text-[11px] font-semibold text-[#20202A]">
                  Stage: <span className="text-[#7651E8] font-bold">Interview Scheduled</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
