import React, { useState } from "react";
import {
  FileText,
  Sparkles,
  Target,
  Layers,
  Kanban,
  CheckCircle,
  Calendar,
  BarChart3,
  ShieldCheck,
  Lock,
  History,
  FileCheck2,
} from "lucide-react";

export const LandingFeaturesSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"all" | "candidates" | "hiring" | "platform">("all");

  const coreFeatures = [
    {
      icon: Sparkles,
      title: "Intelligent Resume Screening",
      description:
        "Evaluate resumes against job-specific requirements and surface relevant evidence, skill matches, and areas needing review.",
      badge: "Core AI",
      colorClass: "bg-purple-100 text-[#7651E8] border-purple-200",
      category: "all",
    },
    {
      icon: Target,
      title: "Candidate Matching",
      description:
        "Help recruiters compare candidate qualifications, skills, and relevant experience against an opening.",
      badge: "Matching",
      colorClass: "bg-pink-100 text-pink-700 border-pink-200",
      category: "all",
    },
    {
      icon: Kanban,
      title: "Job-Specific Hiring Pipelines",
      description:
        "Manage applications independently for each job using structured stages and clear candidate records.",
      badge: "Pipelines",
      colorClass: "bg-blue-100 text-blue-700 border-blue-200",
      category: "hiring",
    },
    {
      icon: Calendar,
      title: "Interview Scheduling",
      description:
        "Coordinate interviews and support Google Calendar and Google Meet integration when authorized.",
      badge: "Scheduling",
      colorClass: "bg-amber-100 text-amber-700 border-amber-200",
      category: "hiring",
    },
    {
      icon: FileCheck2,
      title: "Interview Scorecards",
      description:
        "Capture structured interviewer evaluations and support consistent candidate comparisons.",
      badge: "Evaluation",
      colorClass: "bg-indigo-100 text-indigo-700 border-indigo-200",
      category: "hiring",
    },
    {
      icon: BarChart3,
      title: "Offers and Hiring Decisions",
      description:
        "Manage offer drafts, approvals, candidate responses, and subsequent hiring workflow updates.",
      badge: "Decisions",
      colorClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
      category: "hiring",
    },
  ];

  const candidateFeatures = [
    {
      icon: FileText,
      title: "Resume Upload & Management",
      description:
        "Upload any standard PDF resume up to 5MB with automated metadata extraction, safe parsing, and local persistent storage.",
      badge: "Candidate",
      colorClass: "bg-purple-100 text-[#7651E8] border-purple-200",
      category: "candidates",
    },
    {
      icon: Sparkles,
      title: "AI-Powered Resume Analysis",
      description:
        "Instant local ATS scoring across skills, experience, and education with granular breakdown and low-score coaching suggestions.",
      badge: "Candidate",
      colorClass: "bg-pink-100 text-pink-700 border-pink-200",
      category: "candidates",
    },
    {
      icon: Target,
      title: "Skill Match Insights",
      description:
        "Clear visualization of detected skills against job requisition criteria to highlight strengths and identify qualification gaps.",
      badge: "Candidate",
      colorClass: "bg-blue-100 text-blue-700 border-blue-200",
      category: "candidates",
    },
    {
      icon: Layers,
      title: "Job Applications & Tracking",
      description:
        "Submit job applications with permanent, immutable ATS snapshots and track progression across the 6 canonical stages.",
      badge: "Candidate",
      colorClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
      category: "candidates",
    },
  ];

  const platformFeatures = [
    {
      icon: ShieldCheck,
      title: "Role-Based Access Control (RBAC)",
      description:
        "Strict separation between candidate, hiring_team, and platform_manager roles with zero public self-escalation.",
      badge: "Platform",
      colorClass: "bg-purple-100 text-[#7651E8] border-purple-200",
      category: "platform",
    },
    {
      icon: Lock,
      title: "Secure Document Access & BOLA",
      description:
        "Protected resume downloads and updates guarded by strict ownership validation and authenticated HttpOnly sessions.",
      badge: "Platform",
      colorClass: "bg-blue-100 text-blue-700 border-blue-200",
      category: "platform",
    },
    {
      icon: History,
      title: "Application Audit & Snapshot Durability",
      description:
        "Historical application snapshots remain preserved and immutable even after active profile resumes are modified or replaced.",
      badge: "Platform",
      colorClass: "bg-indigo-100 text-indigo-700 border-indigo-200",
      category: "platform",
    },
  ];

  const displayedFeatures =
    activeTab === "candidates"
      ? candidateFeatures
      : activeTab === "hiring"
      ? coreFeatures.filter((f) => f.category === "hiring")
      : activeTab === "platform"
      ? platformFeatures
      : coreFeatures;

  return (
    <section id="features" className="py-24 bg-[#FAF8FF] relative overflow-hidden border-t border-[#EAE5F0]">
      {/* Ambient background pastel glow */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-[#EEE8FF]/70 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-[#F8DDEA]/60 blur-[130px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EEE8FF] border border-[#DDD4F8] text-[#7651E8] text-xs font-semibold tracking-wider uppercase shadow-xs">
            <span>BUILT FOR THE ENTIRE HIRING JOURNEY</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#20202A]">
            Everything You Need to Hire Smarter
          </h2>

          <p className="text-base sm:text-lg text-[#696977] max-w-2xl mx-auto leading-relaxed">
            From the first resume upload to the final hiring decision, EarlyAI ATS brings the
            recruitment workflow into one connected system.
          </p>

          {/* Category Filter Pills */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-2">
            {[
              { id: "all", label: "Core Capabilities" },
              { id: "candidates", label: "For Candidates" },
              { id: "hiring", label: "For Hiring Teams" },
              { id: "platform", label: "Platform & Security" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-full transition-all duration-200 cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-[#7651E8] text-white shadow-md shadow-purple-500/20"
                    : "bg-white text-[#696977] hover:text-[#20202A] border border-[#EAE5F0] hover:border-[#A78BFA]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Feature Cards Grid (3x2 or responsive) */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {displayedFeatures.map((feature, idx) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="group p-7 sm:p-8 rounded-3xl bg-white border border-[#EAE5F0] hover:border-[#A78BFA] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/5 flex flex-col justify-between shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs border ${feature.colorClass}`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>

                    <span className="text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider bg-slate-50 text-[#696977] border border-[#EAE5F0]">
                      {feature.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-[#20202A] group-hover:text-[#7651E8] transition-colors tracking-tight">
                    {feature.title}
                  </h3>

                  <p className="mt-2.5 text-sm text-[#696977] leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-[#F2EFF7] flex items-center justify-between text-xs text-[#696977]">
                  <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verified in EarlyAI ATS</span>
                  </span>
                  <span className="text-[11px] font-mono font-medium text-slate-400">0{idx + 1}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
