import React from "react";
import { Shield, Lock, FileCheck, Users } from "lucide-react";

export const LandingSecuritySection: React.FC = () => {
  const securityPillars = [
    {
      icon: Shield,
      title: "Strict Role-Based Access Control",
      description:
        "Every public registration receives the candidate role. Privileged hiring_team and platform_manager roles require verified administrative provisioning.",
    },
    {
      icon: Lock,
      title: "Private Document Storage & Ownership",
      description:
        "Resumes and extracted contents are protected on the backend by BOLA ownership checks, preventing cross-candidate unauthorized access.",
    },
    {
      icon: FileCheck,
      title: "Immutable Application Snapshots",
      description:
        "Submitted applications preserve permanent historical ATS report snapshots, remaining intact even if active profile resumes are modified or replaced.",
    },
    {
      icon: Users,
      title: "Protected Authentication Sessions",
      description:
        "Session security utilizes cryptographically signed tokens delivered over secure HttpOnly cookies, guarding against client-side script tampering.",
    },
  ];

  return (
    <section id="security" className="py-24 bg-[#030817] relative overflow-hidden border-t border-blue-500/10">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-blue-600/10 blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-cyan-300 text-xs font-semibold tracking-wider uppercase">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>SECURITY & ARCHITECTURE</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
            Designed for Trust Throughout the Hiring Journey
          </h2>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Enterprise-grade data boundaries and strict authorization controls safeguard candidate
            privacy and recruiter workflows.
          </p>
        </div>

        {/* 4 Security Pillars Grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto">
          {securityPillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className="p-7 rounded-2xl bg-[#07152F]/70 border border-blue-500/20 hover:border-cyan-400/40 backdrop-blur-xl transition-all duration-300 hover:shadow-xl hover:shadow-blue-900/30 flex items-start gap-5"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-400/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-white tracking-tight">{pillar.title}</h3>
                  <p className="text-sm text-slate-300/80 leading-relaxed">{pillar.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
