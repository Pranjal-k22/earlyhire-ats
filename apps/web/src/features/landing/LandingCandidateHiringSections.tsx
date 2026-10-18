import React from "react";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Users,
  Briefcase,
  ChevronRight,
} from "lucide-react";

interface LandingCandidateHiringSectionsProps {
  onOpenAuth: (mode: "login" | "signup") => void;
}

export const LandingCandidateHiringSections: React.FC<LandingCandidateHiringSectionsProps> = ({
  onOpenAuth,
}) => {
  return (
    <div className="space-y-24 py-12">
      {/* =========================================================================
          SECTION A: FOR CANDIDATES
      ========================================================================= */}
      <section id="candidates" className="py-20 bg-[#07152F] relative overflow-hidden border-t border-blue-500/10">
        <div className="absolute top-1/2 -left-20 w-80 h-80 bg-cyan-600/15 blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Messaging & CTA */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 text-xs font-semibold tracking-wider uppercase">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>FOR CANDIDATES</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
                Your Next Opportunity <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                  Starts Here
                </span>
              </h2>

              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
                Organize your resumes, understand your strengths, explore job opportunities,
                and follow your application journey.
              </p>

              <div className="space-y-3 pt-2">
                {[
                  "Personalized ATS compatibility score before applying",
                  "Actionable skill coaching & qualification alignment",
                  "Permanent snapshot preservation of your submitted profile",
                  "Real-time pipeline stage visibility across all applications",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm text-slate-200">
                    <div className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => onOpenAuth("signup")}
                  className="inline-flex items-center gap-2 px-7 py-3.5 text-base font-semibold text-slate-950 bg-white hover:bg-slate-100 rounded-full shadow-lg shadow-cyan-500/20 hover:scale-102 transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-cyan-400"
                >
                  <span>Start as a Candidate</span>
                  <ArrowRight className="w-4 h-4 text-slate-950" />
                </button>
              </div>
            </div>

            {/* Right Column: Candidate Portal UI Preview */}
            <div className="lg:col-span-6">
              <div className="p-6 rounded-3xl bg-[#030817]/90 border border-cyan-500/25 backdrop-blur-2xl shadow-2xl space-y-6">
                {/* Header Profile Bar */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                      PS
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">Priya Sharma</div>
                      <div className="text-xs text-slate-400">Senior Full-Stack Engineer Candidate</div>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-xs font-semibold">
                    Profile Active
                  </span>
                </div>

                {/* ATS Score Breakdown Card */}
                <div className="p-4 rounded-2xl bg-[#07152F] border border-blue-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">ATS Match Readiness</span>
                    <span className="text-lg font-black text-cyan-400 font-mono">88 / 100</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full" style={{ width: "88%" }} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="text-[10px] text-slate-400">Skills</div>
                      <div className="text-xs font-bold text-white">92%</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="text-[10px] text-slate-400">Experience</div>
                      <div className="text-xs font-bold text-white">85%</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="text-[10px] text-slate-400">Education</div>
                      <div className="text-xs font-bold text-white">90%</div>
                    </div>
                  </div>
                </div>

                {/* Application Progression Preview */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Recent Application Status</span>
                    <span className="text-[11px] text-cyan-400">Applied 2d ago</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#07152F] border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Lead Full-Stack Developer</div>
                      <div className="text-[10px] text-slate-400">Engineering • Remote</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 text-[10px] font-bold">
                      Interview Stage
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION B: FOR HIRING TEAMS
      ========================================================================= */}
      <section id="hiring-teams" className="py-20 bg-[#030817] relative overflow-hidden border-t border-blue-500/10">
        <div className="absolute top-1/2 -right-20 w-80 h-80 bg-blue-600/15 blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Hiring Team Workspace UI Preview */}
            <div className="lg:col-span-6 order-2 lg:order-1">
              <div className="p-6 rounded-3xl bg-[#07152F]/90 border border-blue-500/25 backdrop-blur-2xl shadow-2xl space-y-6">
                {/* Workspace Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">Recruiting Workspace</div>
                      <div className="text-xs text-slate-400">Pipeline & Candidate Management</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold">
                    4 Open Roles
                  </span>
                </div>

                {/* Pipeline Stages Mini-Kanban */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Screening</div>
                    <div className="text-base font-extrabold text-white mt-1">12</div>
                    <div className="text-[10px] text-cyan-400 mt-0.5">85% velocity</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-purple-500/30">
                    <div className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">Interview</div>
                    <div className="text-base font-extrabold text-purple-200 mt-1">5</div>
                    <div className="text-[10px] text-purple-400 mt-0.5">3 scheduled</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-emerald-500/30">
                    <div className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Offer</div>
                    <div className="text-base font-extrabold text-emerald-200 mt-1">2</div>
                    <div className="text-[10px] text-emerald-400 mt-0.5">Finalized</div>
                  </div>
                </div>

                {/* Candidate Row Preview */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-300">Candidate Directory Preview</div>
                  <div className="p-3.5 rounded-2xl bg-[#030817] border border-blue-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                        AK
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Aarav Patel</div>
                        <div className="text-[10px] text-slate-400">React • TypeScript • Node.js</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 text-[10px] font-bold">
                        91% ATS
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Messaging & CTA */}
            <div className="lg:col-span-6 order-1 lg:order-2 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold tracking-wider uppercase">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>FOR HIRING TEAMS</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
                A Clearer View of <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                  Every Candidate
                </span>
              </h2>

              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
                Bring candidate profiles, resume reviews, application stages, and interview coordination
                together in one recruitment workspace.
              </p>

              <div className="space-y-3 pt-2">
                {[
                  "Visual 6-stage Kanban recruitment pipeline",
                  "Structured interviewer feedback with confidential internal notes",
                  "Advanced candidate search across experience, tags, and sources",
                  "Recruitment conversion analytics and stage velocity metrics",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm text-slate-200">
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-400/40 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => onOpenAuth("login")}
                  className="inline-flex items-center gap-2 px-7 py-3.5 text-base font-semibold text-slate-950 bg-white hover:bg-slate-100 rounded-full shadow-lg shadow-blue-500/20 hover:scale-102 transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-cyan-400"
                >
                  <span>Access Hiring Workspace</span>
                  <ArrowRight className="w-4 h-4 text-slate-950" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
