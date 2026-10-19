import React from "react";
import { Shield, Lock, FileCheck, Users } from "lucide-react";

export const LandingSecuritySection: React.FC = () => {
  const securityPillars = [
    {
      icon: Shield,
      title: "Strict Role-Based Access Control",
      description:
        "Every public registration receives the candidate role. Privileged hiring_team and platform_manager roles require verified administrative provisioning.",
      color: "bg-purple-100 text-[#7651E8] border-purple-200",
    },
    {
      icon: Lock,
      title: "Private Document Storage & Ownership",
      description:
        "Resumes and extracted contents are protected on the backend by BOLA ownership checks, preventing cross-candidate unauthorized access.",
      color: "bg-blue-100 text-blue-700 border-blue-200",
    },
    {
      icon: FileCheck,
      title: "Immutable Application Snapshots",
      description:
        "Submitted applications preserve permanent historical ATS report snapshots, remaining intact even if active profile resumes are modified or replaced.",
      color: "bg-pink-100 text-pink-700 border-pink-200",
    },
    {
      icon: Users,
      title: "Protected Authentication Sessions",
      description:
        "Session security utilizes cryptographically signed tokens delivered over secure HttpOnly cookies, guarding against client-side script tampering.",
      color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    },
  ];

  return (
    <section id="security" className="py-24 bg-gradient-to-b from-[#FAF8FF] via-[#FFFDFC] to-[#EFF6FF] relative overflow-hidden border-t border-[#EAE5F0]">
      {/* Background pastel glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#EEE8FF]/60 blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EEE8FF] border border-[#DDD4F8] text-[#7651E8] text-xs font-semibold tracking-wider uppercase shadow-xs">
            <Shield className="w-3.5 h-3.5 text-[#7651E8]" />
            <span>SECURITY & ARCHITECTURE</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#20202A]">
            Designed for Trust Throughout the Hiring Journey
          </h2>

          <p className="text-base sm:text-lg text-[#696977] max-w-2xl mx-auto leading-relaxed">
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
                className="p-8 rounded-3xl bg-white border border-[#EAE5F0] hover:border-[#A78BFA] transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/5 flex items-start gap-5 shadow-xs"
              >
                <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${pillar.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-[#20202A] tracking-tight">{pillar.title}</h3>
                  <p className="text-sm text-[#696977] leading-relaxed">{pillar.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
