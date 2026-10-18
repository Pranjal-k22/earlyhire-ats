import React from "react";
import { UserCheck, FileUp, Briefcase, Users, CheckCircle2 } from "lucide-react";

export const LandingHowItWorksSection: React.FC = () => {
  const steps = [
    {
      step: "01",
      title: "Create Your Account",
      subtitle: "Secure Profile Provisioning",
      description:
        "Candidates register securely with candidate role enforcement. Complete your professional profile, contact details, and career preferences.",
      icon: UserCheck,
      color: "from-blue-600 to-cyan-500",
    },
    {
      step: "02",
      title: "Upload and Analyze",
      subtitle: "Local AI Text & Skill Extraction",
      description:
        "Upload a PDF resume up to 5MB. The extraction engine parses qualifications, detects key skills, and computes an immediate ATS breakdown.",
      icon: FileUp,
      color: "from-cyan-500 to-teal-500",
    },
    {
      step: "03",
      title: "Discover and Apply",
      subtitle: "Requisition Matching & Snapshots",
      description:
        "Explore active job openings and submit applications. Each application permanently embeds an immutable snapshot of your ATS analysis.",
      icon: Briefcase,
      color: "from-indigo-600 to-blue-500",
    },
    {
      step: "04",
      title: "Review and Connect",
      subtitle: "Collaborative Decision Support",
      description:
        "Authorized hiring teams review applicant profiles, advance candidates across the 6 pipeline stages, coordinate interviews, and extend offers.",
      icon: Users,
      color: "from-purple-600 to-indigo-500",
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-[#030817] relative overflow-hidden border-t border-blue-500/10">
      {/* Background glow */}
      <div className="absolute top-1/3 right-1/4 w-[450px] h-[450px] bg-indigo-600/10 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 left-1/4 w-[450px] h-[450px] bg-blue-600/10 blur-[130px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 text-xs font-semibold tracking-wider uppercase">
            <span>HOW IT WORKS</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
            Streamlined Recruitment in 4 Steps
          </h2>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            A transparent, connected hiring workflow that empowers both candidates and hiring teams
            with reliable decision support.
          </p>
        </div>

        {/* 4 Steps: Connected Grid on Desktop, Vertical on Mobile */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 relative">
          {steps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="relative p-6 rounded-2xl bg-[#07152F]/70 border border-blue-500/20 hover:border-cyan-400/40 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-900/30 flex flex-col justify-between"
              >
                {/* Step Pill & Step Number */}
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 font-mono">
                      {item.step}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-400/30 flex items-center justify-center text-cyan-400">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-white tracking-tight">{item.title}</h3>
                  <div className="text-xs font-semibold text-cyan-400/90 mt-0.5">{item.subtitle}</div>

                  <p className="mt-3 text-sm text-slate-300/80 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex items-center text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Step {idx + 1} of 4</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Decision Support Disclaimer Notice */}
        <div className="mt-12 p-4 rounded-2xl bg-blue-950/40 border border-blue-500/20 backdrop-blur-md max-w-2xl mx-auto flex items-center justify-center text-center text-xs text-slate-300">
          <p>
            <span className="font-semibold text-cyan-300">Human-In-The-Loop Principle:</span> EarlyAI ATS
            operates strictly as an intelligent decision-support tool. Final hiring and progression
            decisions remain under human review by authorized recruiting teams.
          </p>
        </div>
      </div>
    </section>
  );
};
