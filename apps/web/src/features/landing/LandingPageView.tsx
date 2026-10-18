import React from "react";
import { LandingNavBar } from "./LandingNavBar";
import { LandingHeroSection } from "./LandingHeroSection";
import { LandingFeaturesSection } from "./LandingFeaturesSection";
import { LandingHowItWorksSection } from "./LandingHowItWorksSection";
import { LandingCandidateHiringSections } from "./LandingCandidateHiringSections";
import { LandingSecuritySection } from "./LandingSecuritySection";
import { LandingFooterSection } from "./LandingFooterSection";
import { User } from "../../types/auth";

export interface LandingPageViewProps {
  currentUser: User | null;
  onOpenAuth: (mode: "login" | "signup") => void;
  onNavigateToWorkspace: () => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  currentUser,
  onOpenAuth,
  onNavigateToWorkspace,
}) => {
  const handleExploreFeatures = () => {
    const target = document.getElementById("features");
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-[#030817] text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Fixed Navigation Bar */}
      <LandingNavBar
        currentUser={currentUser}
        onOpenAuth={onOpenAuth}
        onNavigateToWorkspace={onNavigateToWorkspace}
      />

      {/* Main Landing Sections */}
      <main id="main-content">
        <LandingHeroSection
          onOpenAuth={onOpenAuth}
          onExploreFeatures={handleExploreFeatures}
        />

        <LandingFeaturesSection />

        <LandingHowItWorksSection />

        <LandingCandidateHiringSections onOpenAuth={onOpenAuth} />

        <LandingSecuritySection />
      </main>

      {/* Footer Section */}
      <LandingFooterSection onOpenAuth={onOpenAuth} />
    </div>
  );
};
