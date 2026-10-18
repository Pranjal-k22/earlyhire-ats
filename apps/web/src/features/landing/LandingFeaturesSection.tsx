import React, { useState } from "react";
import {
  FileText,
  Sparkles,
  Target,
  Layers,
  Search,
  Kanban,
  CheckCircle,
  Calendar,
  BarChart3,
  ShieldCheck,
  Lock,
  History,
} from "lucide-react";

export const LandingFeaturesSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"all" | "candidates" | "hiring" | "platform">("all");

  const candidateFeatures = [
    {
      icon: FileText,
      title: "Resume Upload & Management",
      description:
        "Upload any standard PDF resume up to 5MB with automated metadata extraction, safe parsing, and local persistent storage.",
      badge: "Candidate",
    },
    {
      icon: Sparkles,
      title: "AI-Powered Resume Analysis",
      description:
        "Instant local ATS scoring across skills, experience, and education with granular breakdown and low-score coaching suggestions.",
      badge: "Candidate",
    },
    {
      icon: Target,
      title: "Skill Match Insights",
      description:
        "Clear visualization of detected skills against job requisition criteria to highlight strengths and identify qualification gaps.",
      badge: "Candidate",
    },
    {
      icon: Layers,
      title: "Job Applications & Tracking",
      description:
        "Submit job applications with permanent, immutable ATS snapshots and track progression across the 6 canonical stages.",
      badge: "Candidate",
    },
  ];

  const hiringTeamFeatures = [
    {
      icon: Search,
      title: "Candidate Discovery & Search",
      description:
        "Multi-attribute candidate filtering by name, email, skills, experience years, and sourcing channels with regex injection safety.",
      badge: "Hiring Team",
    },
    {
      icon: Kanban,
      title: "Job & Application Pipeline",
      description:
        "Manage open requisitions and visually transition candidates through Applied, Screening, Interview, Offer, Hired, and Rejected.",
      badge: "Hiring Team",
    },
    {
      icon: CheckCircle,
      title: "Structured Resume Review",
      description:
        "Inspect verified candidate resumes and review immutable application snapshots alongside independent human evaluation notes.",
      badge: "Hiring Team",
    },
    {
      icon: Calendar,
      title: "Interview & Feedback Management",
      description:
        "Schedule interviews, capture multi-criteria interviewer feedback, and enforce candidate feedback confidentiality until release.",
      badge: "Hiring Team",
    },
    {
      icon: BarChart3,
      title: "Recruitment Analytics & Funnel",
      description:
        "Real-time KPI metrics, conversion rates, stage velocity durations, and sourcing distribution charts for data-driven recruiting.",
      badge: "Hiring Team",
    },
  ];

  const platformFeatures = [
    {
      icon: ShieldCheck,
      title: "Role-Based Access Control (RBAC)",
      description:
        "Strict separation between candidate, hiring_team, and platform_manager roles with zero public self-escalation.",
      badge: "Platform",
    },
    {
      icon: Lock,
      title: "Secure Document Access & BOLA",
      description:
        "Protected resume downloads and updates guarded by strict ownership validation and authenticated HttpOnly sessions.",
      badge: "Platform",
    },
    {
      icon: History,
      title: "Application Audit & Snapshot Durability",
      description:
        "Historical application snapshots remain preserved and immutable even after active profile resumes are modified or replaced.",
      badge: "Platform",
    },
  ];

  const filteredFeatures =
    activeTab === "candidates"
      ? candidateFeatures
      : activeTab === "hiring"
      ? hiringTeamFeatures
      : activeTab === "platform"
      ? platformFeatures
      : [...candidateFeatures, ...hiringTeamFeatures, ...platformFeatures];

  return (
    <section id="features" className="py-24 bg-[#07152F] relative overflow-hidden border-t border-blue-500/10">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-blue-600/10 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-cyan-500/10 blur-[130px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-cyan-300 text-xs font-semibold tracking-wider uppercase">
            <span>BUILT FOR THE ENTIRE HIRING JOURNEY</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
            Everything You Need to Hire Smarter
          </h2>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            From the first resume upload to the final hiring decision, EarlyAI ATS brings the
            recruitment workflow into one connected system.
          </p>

          {/* Category Filter Pills */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-2">
            {[
              { id: "all", label: "All Capabilities" },
              { id: "candidates", label: "For Candidates" },
              { id: "hiring", label: "For Hiring Teams" },
              { id: "platform", label: "Platform & Security" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-full transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-white text-slate-950 shadow-md shadow-white/20"
                    : "bg-slate-900/60 text-slate-300 hover:text-white border border-slate-700/60 hover:border-slate-500"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredFeatures.map((feature, idx) => {
            const Icon = feature.icon;
            const isCandidate = feature.badge === "Candidate";
            const isHiring = feature.badge === "Hiring Team";

            return (
              <div
                key={feature.title}
                className="group p-6 sm:p-7 rounded-2xl bg-[#030817]/70 border border-blue-500/15 hover:border-cyan-400/40 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/30 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md ${
                        isCandidate
                          ? "bg-cyan-500/15 text-cyan-400 border border-cyan-400/30"
                          : isHiring
                          ? "bg-blue-500/15 text-blue-400 border border-blue-400/30"
                          : "bg-purple-500/15 text-purple-400 border border-purple-400/30"
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        isCandidate
                          ? "bg-cyan-950/80 text-cyan-300 border border-cyan-800/40"
                          : isHiring
                          ? "bg-blue-950/80 text-blue-300 border border-blue-800/40"
                          : "bg-purple-950/80 text-purple-300 border border-purple-800/40"
                      }`}
                    >
                      {feature.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors tracking-tight">
                    {feature.title}
                  </h3>

                  <p className="mt-2 text-sm text-slate-300/85 leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 text-cyan-400/90 font-medium">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Verified in EarlyAI ATS</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">0{idx + 1}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
