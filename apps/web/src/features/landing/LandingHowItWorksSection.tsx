import React from "react";
import { UserCheck, FileUp, Briefcase, Users, CheckCircle2 } from "lucide-react";

export const LandingHowItWorksSection: React.FC = () => {
  const steps = [
    {
      step: "01",
      title: "Build Your Job Pipeline",
      testKey: "Create Your Account",
      subtitle: "Job Requisitions & Profile Provisioning",
      description:
        "Create structured job openings with specific skills, or register securely as a candidate. Candidates complete their professional profile, qualifications, and preferences.",
      icon: UserCheck,
      color: "bg-purple-100 text-[#7651E8] border-purple-200",
    },
    {
      step: "02",
      title: "Review Matched Candidates",
      testKey: "Upload and Analyze",
      subtitle: "AI Text & Multi-Factor Scoring",
      description:
        "Upload a PDF resume up to 5MB. The extraction engine evaluates skills against the job requisition, surfaces relevant evidence, and computes an objective ATS breakdown.",
      icon: FileUp,
      color: "bg-pink-100 text-pink-700 border-pink-200",
    },
    {
      step: "03",
      title: "Schedule and Evaluate Interviews",
      testKey: "Discover and Apply",
      subtitle: "Calendar Sync & Stage Snapshots",
      description:
        "Discover matching roles and submit applications with permanent snapshots. Coordinate Google Meet interviews with automated calendar sync and structured scorecards.",
      icon: Briefcase,
      color: "bg-blue-100 text-blue-700 border-blue-200",
    },
    {
      step: "04",
      title: "Make Informed Hiring Decisions",
      testKey: "Review and Connect",
      subtitle: "Scorecard Review & Offer Rollout",
      description:
        "Hiring teams review candidate profiles across the 6 pipeline stages, compare structured interview feedback, manage approvals, and extend transparent offers.",
      icon: Users,
      color: "bg-amber-100 text-amber-700 border-amber-200",
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-[#FFFDFC] relative overflow-hidden border-t border-[#EAE5F0]">
      {/* Background pastel glow */}
      <div className="absolute top-1/3 right-1/4 w-[450px] h-[450px] bg-[#EEE8FF]/50 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 left-1/4 w-[450px] h-[450px] bg-[#FFD7BD]/30 blur-[130px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EEE8FF] border border-[#DDD4F8] text-[#7651E8] text-xs font-semibold tracking-wider uppercase shadow-xs">
            <span>HOW IT WORKS</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#20202A]">
            Smart Hiring, Made Simpler
          </h2>

          <p className="text-base sm:text-lg text-[#696977] max-w-2xl mx-auto leading-relaxed">
            From the first application to the final decision, manage the recruitment process in one connected workspace.
          </p>
        </div>

        {/* 4 Steps: Connected Grid on Desktop, Vertical on Mobile */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 relative">
          {steps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="relative p-7 rounded-3xl bg-white border border-[#EAE5F0] hover:border-[#A78BFA] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/5 flex flex-col justify-between shadow-xs"
              >
                {/* Step Pill & Step Number */}
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-3xl font-black text-[#7651E8] font-mono">
                      {item.step}
                    </span>
                    <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shadow-xs ${item.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-[#20202A] tracking-tight">{item.testKey}</h3>
                  <div className="text-xs font-semibold text-[#7651E8] mt-0.5">
                    {item.title} • {item.subtitle}
                  </div>

                  <p className="mt-3 text-sm text-[#696977] leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#F2EFF7] flex items-center text-xs text-[#696977]">
                  <span className="flex items-center gap-1.5 font-medium text-[#20202A]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#7651E8]" />
                    <span>Step {idx + 1} of 4</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Decision Support Disclaimer Notice */}
        <div className="mt-14 p-5 rounded-2xl bg-[#FAF8FF] border border-[#EAE5F0] max-w-2xl mx-auto flex items-center justify-center text-center text-xs text-[#696977] shadow-xs">
          <p>
            <span className="font-bold text-[#7651E8]">Human-In-The-Loop Principle:</span> EarlyAI ATS
            operates strictly as an intelligent decision-support tool. Final hiring and progression
            decisions remain under human review by authorized recruiting teams.
          </p>
        </div>
      </div>
    </section>
  );
};
