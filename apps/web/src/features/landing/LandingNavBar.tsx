import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Menu,
  X,
  UserPlus,
  ArrowRight,
  Shield,
  Layers,
  Users,
  Briefcase,
  HelpCircle,
} from "lucide-react";
import { User } from "../../types/auth";

interface LandingNavBarProps {
  currentUser: User | null;
  onOpenAuth: (mode: "login" | "signup") => void;
  onNavigateToWorkspace: () => void;
}

export const LandingNavBar: React.FC<LandingNavBarProps> = ({
  currentUser,
  onOpenAuth,
  onNavigateToWorkspace,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Escape key listener for accessible mobile menu dismissal
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileMenuOpen]);

  const navLinks = [
    { label: "Features", href: "#features", icon: Layers },
    { label: "How It Works", href: "#how-it-works", icon: HelpCircle },
    { label: "For Candidates", href: "#candidates", icon: Users },
    { label: "For Hiring Teams", href: "#hiring-teams", icon: Briefcase },
    { label: "Security", href: "#security", icon: Shield },
  ];

  const handleNavLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/90 backdrop-blur-md border-b border-[#EAE5F0] shadow-xs"
          : "bg-white/60 backdrop-blur-sm border-b border-[#EAE5F0]/60"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center gap-3 group cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-purple-400 rounded-xl p-1"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7651E8] via-[#8B5CF6] to-[#A78BFA] flex items-center justify-center text-white shadow-md shadow-purple-500/25 group-hover:scale-105 transition-transform duration-200">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-[#20202A] flex items-center gap-1.5 font-sans">
                EarlyAI <span className="text-[#7651E8] font-extrabold">ATS</span>
              </span>
              <span className="text-[10px] text-[#696977] font-medium tracking-wide uppercase">
                Intelligent Recruitment
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav aria-label="Main Navigation" className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleNavLinkClick(e, link.href)}
                className="text-sm font-medium text-[#696977] hover:text-[#7651E8] transition-colors py-1.5 focus:outline-hidden focus:ring-2 focus:ring-purple-400 rounded-md"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right Controls */}
          <div className="hidden sm:flex items-center gap-4">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="hidden md:flex flex-col items-end text-right">
                  <span className="text-xs font-semibold text-[#20202A]">{currentUser.name}</span>
                  <span className="text-[10px] text-[#7651E8] uppercase font-medium">
                    {currentUser.role.replace("_", " ")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onNavigateToWorkspace}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#7651E8] hover:bg-[#633DD8] rounded-full shadow-md shadow-purple-500/20 transition-all hover:scale-102 focus:outline-hidden focus:ring-2 focus:ring-purple-400"
                >
                  <span>Enter Workspace</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  data-testid="header-sign-in-button"
                  onClick={() => onOpenAuth("login")}
                  className="px-4 py-2 text-sm font-medium text-[#20202A] hover:text-[#7651E8] transition-colors focus:outline-hidden focus:ring-2 focus:ring-purple-400 rounded-full"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  data-testid="header-register-button"
                  onClick={() => onOpenAuth("signup")}
                  className="relative group inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-slate-950 bg-[#FFAA45] hover:bg-[#F59218] rounded-full shadow-md shadow-amber-500/20 transition-all duration-200 hover:scale-102 focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                >
                  <UserPlus className="w-4 h-4 text-slate-950" />
                  <span>Get Started</span>
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Trigger */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              className="p-2 text-[#20202A] hover:text-[#7651E8] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-400"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Accessible Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
          className="fixed inset-0 top-20 z-40 bg-white/95 backdrop-blur-xl border-t border-[#EAE5F0] sm:hidden flex flex-col p-6 space-y-6 shadow-xl"
        >
          <nav className="flex flex-col space-y-3">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => handleNavLinkClick(e, link.href)}
                  className="flex items-center gap-3 p-3 text-base font-medium text-[#20202A] hover:text-[#7651E8] hover:bg-purple-50 rounded-xl transition-colors"
                >
                  <Icon className="w-5 h-5 text-[#7651E8]" />
                  <span>{link.label}</span>
                </a>
              );
            })}
          </nav>

          <div className="pt-6 border-t border-[#EAE5F0] flex flex-col gap-3">
            {currentUser ? (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onNavigateToWorkspace();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold text-white bg-[#7651E8] hover:bg-[#633DD8] rounded-xl shadow-md"
              >
                <span>Enter Workspace</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenAuth("login");
                  }}
                  className="w-full py-3 px-4 text-sm font-semibold text-[#20202A] border border-[#EAE5F0] bg-white rounded-xl hover:bg-slate-50"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenAuth("signup");
                  }}
                  className="w-full py-3 px-4 text-sm font-bold text-slate-950 bg-[#FFAA45] hover:bg-[#F59218] rounded-xl shadow-md shadow-amber-500/20"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
