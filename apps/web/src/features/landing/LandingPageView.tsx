import React from "react";
import { LandingNavBar } from "./LandingNavBar";
import { LandingHeroSection } from "./LandingHeroSection";
import { LandingTrustStrip } from "./LandingTrustStrip";
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
    <div className="min-h-screen bg-[#FFFCFA] text-[#20202A] font-sans selection:bg-purple-200 selection:text-purple-900">
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

        {/* Trust & Capabilities Transition Bar */}
        <LandingTrustStrip />

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
