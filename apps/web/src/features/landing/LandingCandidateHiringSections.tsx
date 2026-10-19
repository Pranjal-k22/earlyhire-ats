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
    <div className="space-y-20 py-12 bg-[#FFFCFA]">
      {/* =========================================================================
          SECTION A: FOR CANDIDATES
      ========================================================================= */}
      <section id="candidates" className="py-20 bg-gradient-to-br from-[#F5F9FF] via-[#FAF7FF] to-[#FDF4F8] relative overflow-hidden border-t border-[#EAE5F0]">
        <div className="absolute top-1/2 -left-20 w-80 h-80 bg-cyan-200/40 blur-[120px] pointer-events-none rounded-full" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-purple-200/40 blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Messaging & CTA */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-100 border border-cyan-200 text-cyan-800 text-xs font-semibold tracking-wider uppercase shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-cyan-700" />
                <span>FOR CANDIDATES</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#20202A] leading-tight">
                Your Next Opportunity <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7651E8] via-[#0284C7] to-[#0D9488]">
                  Starts Here
                </span>
              </h2>

              <p className="text-base sm:text-lg text-[#696977] leading-relaxed max-w-xl">
                Organize your resumes, understand your strengths, explore job opportunities,
                and follow your application journey with complete transparency.
              </p>

              <div className="space-y-3 pt-2">
                {[
                  "Personalized ATS compatibility score before applying",
                  "Actionable skill coaching & qualification alignment",
                  "Permanent snapshot preservation of your submitted profile",
                  "Real-time pipeline stage visibility across all applications",
                  "Review scheduled interviews and access permitted Google Meet links",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm text-[#20202A]">
                    <div className="w-5 h-5 rounded-full bg-cyan-100 border border-cyan-300 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-700" />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => onOpenAuth("signup")}
                  className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-bold text-slate-950 bg-[#FFAA45] hover:bg-[#F59218] rounded-full shadow-lg shadow-amber-500/20 hover:scale-102 transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-amber-400 cursor-pointer"
                >
                  <span>Start as a Candidate</span>
                  <ArrowRight className="w-4 h-4 text-slate-950" />
                </button>
              </div>
            </div>

            {/* Right Column: Candidate Portal UI Preview */}
            <div className="lg:col-span-6">
              <div className="p-7 rounded-3xl bg-white border border-[#EAE5F0] shadow-xl space-y-6">
                {/* Header Profile Bar */}
                <div className="flex items-center justify-between pb-4 border-b border-[#F2EFF7]">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#7651E8] to-[#9333EA] flex items-center justify-center text-white font-bold text-sm shadow-xs">
                      PS
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#20202A]">Priya Sharma</div>
                      <div className="text-xs text-[#696977]">Senior Full-Stack Engineer Candidate</div>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                    Profile Active
                  </span>
                </div>

                {/* ATS Score Breakdown Card */}
                <div className="p-5 rounded-2xl bg-[#FAF8FF] border border-[#EAE5F0] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#20202A]">ATS Match Readiness</span>
                    <span className="text-lg font-black text-[#7651E8] font-mono">88 / 100</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#7651E8] to-cyan-500 rounded-full" style={{ width: "88%" }} />
                  </div>
                  <div className="grid grid-cols-3 gap-2.5 pt-1 text-center">
                    <div className="p-2.5 rounded-xl bg-white border border-[#EAE5F0] shadow-xs">
                      <div className="text-[10px] font-medium text-[#696977]">Skills</div>
                      <div className="text-xs font-bold text-[#20202A]">92%</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-[#EAE5F0] shadow-xs">
                      <div className="text-[10px] font-medium text-[#696977]">Experience</div>
                      <div className="text-xs font-bold text-[#20202A]">85%</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-[#EAE5F0] shadow-xs">
                      <div className="text-[10px] font-medium text-[#696977]">Education</div>
                      <div className="text-xs font-bold text-[#20202A]">90%</div>
                    </div>
                  </div>
                </div>

                {/* Application Progression Preview */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-[#20202A] flex items-center justify-between">
                    <span>Recent Application Status</span>
                    <span className="text-[11px] font-semibold text-[#7651E8]">Applied 2d ago</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#FAF8FF] border border-[#EAE5F0] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#20202A]">Lead Full-Stack Developer</div>
                      <div className="text-[10px] text-[#696977]">Engineering • Remote</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-purple-100 text-[#7651E8] border border-purple-200 text-[10px] font-bold">
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
      <section id="hiring-teams" className="py-20 bg-gradient-to-br from-[#FAF7FF] via-[#FFF5F8] to-[#F5F8FF] relative overflow-hidden border-t border-[#EAE5F0]">
        <div className="absolute top-1/2 -right-20 w-80 h-80 bg-purple-200/40 blur-[120px] pointer-events-none rounded-full" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-pink-200/40 blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Hiring Team Workspace UI Preview */}
            <div className="lg:col-span-6 order-2 lg:order-1">
              <div className="p-7 rounded-3xl bg-white border border-[#EAE5F0] shadow-xl space-y-6">
                {/* Workspace Header */}
                <div className="flex items-center justify-between pb-4 border-b border-[#F2EFF7]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center text-[#7651E8]">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#20202A]">Recruiting Workspace</div>
                      <div className="text-xs text-[#696977]">Pipeline & Candidate Management</div>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                    4 Open Roles
                  </span>
                </div>

                {/* Pipeline Stages Mini-Kanban */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-[#FAF8FF] border border-[#EAE5F0]">
                    <div className="text-[10px] font-bold text-[#696977] uppercase tracking-wider">Screening</div>
                    <div className="text-base font-extrabold text-[#20202A] mt-1">12</div>
                    <div className="text-[10px] text-[#7651E8] font-semibold mt-0.5">85% velocity</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200">
                    <div className="text-[10px] font-bold text-[#7651E8] uppercase tracking-wider">Interview</div>
                    <div className="text-base font-extrabold text-[#7651E8] mt-1">5</div>
                    <div className="text-[10px] text-purple-700 font-semibold mt-0.5">3 scheduled</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                    <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Offer</div>
                    <div className="text-base font-extrabold text-emerald-700 mt-1">2</div>
                    <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Finalized</div>
                  </div>
                </div>

                {/* Candidate Row Preview */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-[#20202A]">Candidate Directory Preview</div>
                  <div className="p-4 rounded-2xl bg-[#FAF8FF] border border-[#EAE5F0] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#7651E8] to-[#9333EA] flex items-center justify-center text-white text-xs font-bold">
                        AK
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#20202A]">Aarav Patel</div>
                        <div className="text-[10px] text-[#696977]">React • TypeScript • Node.js</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                        91% ATS
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Messaging & CTA */}
            <div className="lg:col-span-6 order-1 lg:order-2 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100 border border-purple-200 text-[#7651E8] text-xs font-semibold tracking-wider uppercase shadow-xs">
                <Users className="w-3.5 h-3.5 text-[#7651E8]" />
                <span>FOR HIRING TEAMS</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#20202A] leading-tight">
                A Clearer View of <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7651E8] via-[#9333EA] to-[#EC4899]">
                  Every Candidate
                </span>
              </h2>

              <p className="text-base sm:text-lg text-[#696977] leading-relaxed max-w-xl">
                Bring candidate profiles, resume reviews, application stages, and interview coordination
                together in one recruitment workspace.
              </p>

              <div className="space-y-3 pt-2">
                {[
                  "Visual 6-stage Kanban recruitment pipeline",
                  "Structured interviewer feedback with confidential internal notes",
                  "Advanced candidate search across experience, tags, and sources",
                  "Recruitment conversion analytics and stage velocity metrics",
                  "Google Calendar & Meet integration for auto-provisioned interviews",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm text-[#20202A]">
                    <div className="w-5 h-5 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#7651E8]" />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => onOpenAuth("login")}
                  className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-bold text-white bg-[#7651E8] hover:bg-[#633DD8] rounded-full shadow-lg shadow-purple-500/20 hover:scale-102 transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-purple-400 cursor-pointer"
                >
                  <span>Access Hiring Workspace</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
