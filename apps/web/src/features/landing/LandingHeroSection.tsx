import React, { useState } from "react";
import {
  ArrowRight,
  FileText,
  CheckCircle2,
  Compass,
  Check,
  Activity,
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
    <section className="relative min-h-[92vh] pt-32 pb-20 overflow-hidden flex items-center bg-[#030817]">
      {/* Background Radial Glow & Atmosphere */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[550px] bg-gradient-to-tr from-blue-700/20 via-indigo-600/15 to-cyan-500/10 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute top-10 right-10 w-[500px] h-[500px] bg-cyan-600/10 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-purple-600/10 blur-[120px] pointer-events-none rounded-full" />

      {/* Subtle Star Grid Background */}
      <div
        className="absolute inset-0 opacity-[0.18] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.4) 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Side: Product Messaging & Editorial Hero */}
          <div className="lg:col-span-6 xl:col-span-7 flex flex-col items-start text-left space-y-6">
            {/* Small uppercase eyebrow badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-semibold tracking-wider uppercase backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>AI-POWERED RECRUITMENT PLATFORM</span>
            </div>

            {/* Editorial Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-light tracking-tight text-white leading-[1.08] font-sans">
              Find Better Matches. <br />
              <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-cyan-300">
                Build Better Teams.
              </span>
            </h1>

            {/* Supporting Description */}
            <p className="text-lg sm:text-xl text-slate-300/90 font-normal max-w-xl leading-relaxed">
              Turn resumes into actionable insights, connect candidates with the right opportunities,
              and manage the hiring journey in one intelligent recruitment workspace.
            </p>

            {/* Dual Call-to-Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              {/* Primary CTA */}
              <button
                type="button"
                onClick={() => onOpenAuth("signup")}
                className="relative group inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold text-slate-950 bg-white hover:bg-slate-100 rounded-full transition-all duration-200 hover:scale-103 focus:outline-hidden focus:ring-2 focus:ring-cyan-400 shadow-xl"
              >
                <span className="absolute -inset-1 bg-gradient-to-r from-white via-cyan-300 to-blue-500 rounded-full blur-md opacity-70 group-hover:opacity-100 transition duration-300" />
                <span className="relative flex items-center gap-2 text-slate-950 font-bold">
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4 text-slate-950 transition-transform group-hover:translate-x-1" />
                </span>
              </button>

              {/* Secondary CTA */}
              <button
                type="button"
                onClick={onExploreFeatures}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-medium text-slate-200 hover:text-white bg-slate-900/60 hover:bg-slate-900/90 border border-slate-700/80 hover:border-cyan-400/50 rounded-full backdrop-blur-md transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-cyan-400"
              >
                <Compass className="w-4 h-4 text-cyan-400" />
                <span>Explore Features</span>
              </button>
            </div>

            {/* Supporting Micro-Statement */}
            <p className="text-xs text-slate-400/80 font-medium tracking-wide">
              One connected workspace for candidates and hiring teams.
            </p>

            {/* Phase 3: Lower Hero Collaboration Visuals (Inspired by Reference) */}
            <div className="pt-8 sm:pt-10 w-full max-w-md">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 to-slate-900/60 border border-blue-500/20 backdrop-blur-xl flex items-center justify-between gap-4 shadow-xl">
                {/* Connected User Avatars */}
                <div className="flex items-center">
                  <div className="flex -space-x-2.5 overflow-hidden">
                    <div className="inline-block h-9 w-9 rounded-full ring-2 ring-blue-500/60 bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-md">
                      PS
                    </div>
                    <div className="inline-block h-9 w-9 rounded-full ring-2 ring-cyan-400/60 bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-md">
                      ER
                    </div>
                    <div className="inline-block h-9 w-9 rounded-full ring-2 ring-emerald-400/60 bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-xs font-bold text-white shadow-md">
                      AK
                    </div>
                    <div className="inline-block h-9 w-9 rounded-full ring-2 ring-slate-700 bg-slate-800 flex items-center justify-center text-[10px] font-semibold text-cyan-300">
                      +12
                    </div>
                  </div>
                </div>

                {/* Floating Invite Widget */}
                <div className="flex items-center gap-2">
                  <div className="px-2.5 py-1 rounded-full bg-white/10 text-[11px] font-medium text-slate-300 flex items-center gap-1.5 border border-white/10">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Talent meets opportunity</span>
                  </div>
                  <div className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider hidden sm:block">
                    Seamless Collaboration+
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Signature Visual & Floating Recruitment UI Panels */}
          <div className="lg:col-span-6 xl:col-span-5 relative flex items-center justify-center min-h-[440px] sm:min-h-[520px]">
            {/* Luminous Earth / Talent Network Visual */}
            <div className="relative w-full max-w-[480px] aspect-square flex items-center justify-center">
              {/* Outer Atmospheric Glow Rings */}
              <div className="absolute inset-0 rounded-full border border-cyan-400/20 scale-110 pointer-events-none animate-pulse-subtle" />
              <div className="absolute inset-0 rounded-full border border-blue-500/30 scale-125 pointer-events-none" />
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-600/20 via-cyan-400/10 to-transparent blur-2xl pointer-events-none" />

              {!imageError ? (
                <img
                  src="/hero-globe.jpg"
                  alt="EarlyAI ATS Global Talent Network Visual"
                  onError={() => setImageError(true)}
                  className="w-full h-full object-cover rounded-full shadow-[0_0_80px_rgba(37,99,235,0.45)] ring-1 ring-cyan-400/40 relative z-10"
                />
              ) : (
                /* Fallback SVG Network Globe if Image is unavailable */
                <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#07152F] via-[#102B66] to-[#0A4399] flex items-center justify-center relative overflow-hidden shadow-[0_0_80px_rgba(37,99,235,0.45)] ring-1 ring-cyan-400/40">
                  <svg className="w-full h-full opacity-60" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r="90" fill="none" stroke="#22D3EE" strokeWidth="0.8" strokeDasharray="3,3" />
                    <circle cx="100" cy="100" r="70" fill="none" stroke="#60A5FA" strokeWidth="1" />
                    <circle cx="100" cy="100" r="45" fill="none" stroke="#38BDF8" strokeWidth="0.8" strokeDasharray="4,4" />
                    <path d="M 20,100 Q 100,20 180,100" fill="none" stroke="#22D3EE" strokeWidth="1.2" />
                    <path d="M 20,100 Q 100,180 180,100" fill="none" stroke="#60A5FA" strokeWidth="1.2" />
                    <path d="M 100,20 Q 30,100 100,180" fill="none" stroke="#38BDF8" strokeWidth="1" />
                    <path d="M 100,20 Q 170,100 100,180" fill="none" stroke="#22D3EE" strokeWidth="1" />
                  </svg>
                </div>
              )}

              {/* Floating Panel 1: Candidate Match Card (Top-Left) */}
              <div className="absolute -top-6 -left-6 sm:-left-8 z-20 w-64 p-3.5 rounded-2xl bg-[#07152F]/85 border border-cyan-400/35 backdrop-blur-xl shadow-2xl shadow-black/60 animate-float-slow">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                      PS
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">Priya Sharma</div>
                      <div className="text-[10px] text-slate-400">Full-Stack Engineer</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>94%</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-900/60 text-blue-200 border border-blue-700/50">
                    React
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-900/60 text-blue-200 border border-blue-700/50">
                    TypeScript
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-900/60 text-blue-200 border border-blue-700/50">
                    Node.js
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-cyan-900/60 text-cyan-200 border border-cyan-700/50">
                    Docker
                  </span>
                </div>
              </div>

              {/* Floating Panel 2: Resume Analysis Card (Bottom-Right) */}
              <div className="absolute -bottom-6 -right-4 sm:-right-8 z-20 w-72 p-3.5 rounded-2xl bg-[#07152F]/85 border border-blue-500/35 backdrop-blur-xl shadow-2xl shadow-black/60 animate-float-reverse">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-300">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white truncate">
                      priya_sharma_resume.pdf
                    </div>
                    <div className="text-[10px] text-cyan-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                      <span>ATS Analysis Complete</span>
                    </div>
                  </div>
                </div>
                {/* Score Breakdown Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[10px] font-medium text-slate-300">
                    <span>Skills Match</span>
                    <span className="text-cyan-300 font-bold">96%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                      style={{ width: "96%" }}
                    />
                  </div>
                </div>
              </div>

              {/* Floating Panel 3: Pipeline Stage Progress Pill (Bottom-Left) */}
              <div className="absolute top-2/3 -left-4 sm:-left-10 z-20 px-3 py-2 rounded-xl bg-[#030817]/90 border border-purple-500/30 backdrop-blur-xl shadow-xl flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400 animate-pulse" />
                <div className="text-[11px] font-medium text-slate-200">
                  Stage: <span className="text-purple-300 font-bold">Interview Scheduled</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
