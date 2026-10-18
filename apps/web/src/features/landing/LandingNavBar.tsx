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
          ? "bg-[#030817]/85 backdrop-blur-md border-b border-blue-500/15 shadow-xl shadow-black/40"
          : "bg-transparent border-b border-white/5"
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
            className="flex items-center gap-3 group cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-cyan-400 rounded-xl p-1"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform duration-200">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5 font-sans">
                EarlyAI <span className="text-cyan-400 font-extrabold">ATS</span>
              </span>
              <span className="text-[10px] text-blue-300/80 font-medium tracking-wide uppercase">
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
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors py-1.5 focus:outline-hidden focus:ring-2 focus:ring-cyan-400 rounded-md"
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
                  <span className="text-xs font-semibold text-white">{currentUser.name}</span>
                  <span className="text-[10px] text-cyan-300 uppercase font-medium">
                    {currentUser.role.replace("_", " ")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onNavigateToWorkspace}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-full shadow-lg shadow-blue-500/20 transition-all hover:scale-102 focus:outline-hidden focus:ring-2 focus:ring-white"
                >
                  <span>Enter Workspace</span>
                  <ArrowRight className="w-4 h-4 text-slate-900" />
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  data-testid="header-sign-in-button"
                  onClick={() => onOpenAuth("login")}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors focus:outline-hidden focus:ring-2 focus:ring-cyan-400 rounded-full"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  data-testid="header-register-button"
                  onClick={() => onOpenAuth("signup")}
                  className="relative group inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-950 bg-white hover:bg-slate-100 rounded-full shadow-xl transition-all duration-200 hover:scale-102 focus:outline-hidden focus:ring-2 focus:ring-cyan-400"
                >
                  <span className="absolute -inset-0.5 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full blur-xs opacity-60 group-hover:opacity-100 transition duration-200" />
                  <span className="relative flex items-center gap-1.5 text-slate-950">
                    <UserPlus className="w-4 h-4 text-blue-600" />
                    <span>Get Started</span>
                  </span>
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
              className="p-2 text-slate-300 hover:text-white rounded-lg focus:outline-hidden focus:ring-2 focus:ring-cyan-400"
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
          className="fixed inset-0 top-20 z-40 bg-[#030817]/95 backdrop-blur-xl border-t border-blue-500/20 sm:hidden flex flex-col p-6 space-y-6"
        >
          <nav className="flex flex-col space-y-4">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => handleNavLinkClick(e, link.href)}
                  className="flex items-center gap-3 p-3 text-base font-medium text-slate-200 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                >
                  <Icon className="w-5 h-5 text-cyan-400" />
                  <span>{link.label}</span>
                </a>
              );
            })}
          </nav>

          <div className="pt-6 border-t border-white/10 flex flex-col gap-3">
            {currentUser ? (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onNavigateToWorkspace();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold text-slate-950 bg-white rounded-xl shadow-lg"
              >
                <span>Enter Workspace</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenAuth("login");
                  }}
                  className="w-full py-3 px-4 text-sm font-medium text-white border border-white/20 rounded-xl hover:bg-white/5"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenAuth("signup");
                  }}
                  className="w-full py-3 px-4 text-sm font-semibold text-slate-950 bg-white rounded-xl shadow-lg shadow-blue-500/20"
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
