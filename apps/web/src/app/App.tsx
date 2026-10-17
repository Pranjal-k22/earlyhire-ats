import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  Briefcase,
  Layers,
  LayoutDashboard,
  Search,
  Bell,
  ChevronDown,
  CheckCircle2,
  FileText,
  AlertTriangle,
  Menu,
  X,
  LogIn,
  LogOut,
  UserPlus,
  Shield,
  Sparkles,
  Cpu,
} from "lucide-react";

import { JobsView } from "../features/jobs/JobsView";
import { CandidatesView } from "../features/candidates/CandidatesView";
import { PipelineView } from "../features/pipeline/PipelineView";
import { DashboardView } from "../features/dashboard/DashboardView";
import { CandidatePortalView } from "../features/candidate/CandidatePortalView";
import { PlatformPortalView } from "../features/platform/PlatformPortalView";
import { NotificationsDropdown } from "../features/notifications/NotificationsDropdown";
import { AuthModal } from "../features/auth/AuthModal";
import { fetchMe, logout } from "../api/authApi";
import { API_BASE } from "../api/baseUrl";
import { User } from "../types/auth";

interface HealthStatus {
  status: string;
  service: string;
}

export type AppTab = "overview" | "jobs" | "candidates" | "pipeline" | "candidate" | "platform";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>("overview");
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "signup">("login");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  // Responsive Mobile Nav State
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);

  const userMenuRef = useRef<HTMLDivElement>(null);

  // Load API Health
  useEffect(() => {
    fetch(`${API_BASE}/api/v1/health`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data: HealthStatus) => {
        setHealth(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Check Recruiter Session on Mount
  useEffect(() => {
    fetchMe()
      .then((res) => {
        if (res?.data?.user) {
          setCurrentUser(res.data.user);
          const role = res.data.user.canonicalRole || res.data.user.role;
          if (role === "candidate") {
            setActiveTab("candidate");
          }
        } else {
          setCurrentUser(null);
        }
      })
      .catch(() => {
        // Unauthenticated or network error — session inactive
        setCurrentUser(null);
      })
      .finally(() => {
        setAuthChecking(false);
      });
  }, []);

  // Close User Menu on Outside Click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isUserMenuOpen]);

  const handleOpenAuth = (mode: "login" | "signup") => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
    setIsUserMenuOpen(false);
    setIsMobileNavOpen(false);
  };

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    const role = user.canonicalRole || user.role;
    if (role === "candidate") {
      setActiveTab("candidate");
    }
    setAuthNotice(`Signed in as ${user.name}`);
    setTimeout(() => setAuthNotice(null), 4000);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Ignored - clear local user state regardless
    }
    setCurrentUser(null);
    setIsUserMenuOpen(false);
    setAuthNotice("Successfully signed out");
    setTimeout(() => setAuthNotice(null), 4000);
  };

  const getUserInitials = (name: string) => {
    if (!name) return "EA";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const userRole = currentUser?.canonicalRole || currentUser?.role;
  const isCandidate = userRole === "candidate";
  const isPlatformManager = userRole === "platform_manager" || userRole === "admin";

  const navigationItems = isCandidate
    ? [
        { id: "candidate" as AppTab, label: "My ATS Portal", icon: Sparkles },
        { id: "jobs" as AppTab, label: "Explore Jobs", icon: Briefcase },
      ]
    : [
        { id: "overview" as AppTab, label: "Dashboard", icon: LayoutDashboard },
        { id: "candidates" as AppTab, label: "Candidates", icon: Users },
        { id: "jobs" as AppTab, label: "Jobs", icon: Briefcase },
        { id: "pipeline" as AppTab, label: "Pipeline", icon: Layers },
        { id: "candidate" as AppTab, label: "Candidate View", icon: Sparkles },
        ...(isPlatformManager
          ? [{ id: "platform" as AppTab, label: "Platform Ops", icon: Cpu }]
          : []),
      ];

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Mobile Nav Backdrop Overlay */}
      {isMobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden"
          onClick={() => setIsMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation (Desktop Fixed, Mobile Drawer) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 shadow-lg transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:z-auto ${
          isMobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Logo & Mobile Close */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-500 flex items-center justify-center text-white font-bold shadow-md">
              EA
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">EarlyAI ATS</h1>
              <p className="text-xs text-slate-400">Recruiting Workspace</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileNavOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg md:hidden"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5" aria-label="Main Navigation">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileNavOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all text-left ${
                  isActive
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
          <a
            href="#reports"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab("overview");
              setIsMobileNavOpen(false);
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white font-medium transition-all"
          >
            <FileText className="w-5 h-5 text-slate-400" />
            <span>Reports</span>
          </a>
        </nav>

        {/* Footer / System Status */}
        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800/60 rounded-lg p-3 text-xs text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${health ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              API Status
            </span>
            <span className="font-mono text-slate-300">
              {loading ? "Checking..." : health ? "Online" : "Offline"}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between shadow-subtle shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(true)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg md:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Search Bar */}
            <div className="relative w-48 sm:w-72 md:w-80 lg:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search candidates, jobs, or skills..."
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Right Action Icons & User Dropdown */}
          <div className="flex items-center gap-2 sm:gap-4">
            {currentUser ? (
              <NotificationsDropdown />
            ) : (
              <div className="p-2 text-slate-300 rounded-lg hidden sm:flex">
                <Bell className="w-5 h-5 opacity-40" />
              </div>
            )}

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            {/* User Session Profile / Sign In Buttons */}
            {!authChecking && currentUser ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                  aria-label="User account menu"
                >
                  <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-semibold text-xs flex items-center justify-center border border-brand-200">
                    {getUserInitials(currentUser.name)}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-sm font-semibold text-slate-800 leading-none">{currentUser.name}</p>
                    <p className="text-[11px] text-slate-500 capitalize leading-none mt-1">
                      {(currentUser.canonicalRole || currentUser.role).replace("_", " ")}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-800 truncate">{currentUser.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <Shield className="w-3 h-3 text-brand-600" />
                        <span className="text-[10px] uppercase font-bold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded">
                          {currentUser.canonicalRole || currentUser.role}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : !authChecking ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="header-sign-in-button"
                  onClick={() => handleOpenAuth("login")}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  data-testid="header-register-button"
                  onClick={() => handleOpenAuth("signup")}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-2xs transition-colors hidden sm:flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register</span>
                </button>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse" />
            )}
          </div>
        </header>

        {/* Global Feedback Banner */}
        {authNotice && (
          <div className="bg-brand-600 text-white text-xs px-6 py-2 flex items-center justify-between animate-in fade-in duration-200">
            <span className="font-medium">{authNotice}</span>
            <button
              type="button"
              onClick={() => setAuthNotice(null)}
              className="text-white/80 hover:text-white text-xs font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
          {activeTab === "jobs" ? (
            <JobsView />
          ) : activeTab === "candidates" ? (
            <CandidatesView />
          ) : activeTab === "pipeline" ? (
            <PipelineView />
          ) : activeTab === "candidate" ? (
            <CandidatePortalView />
          ) : activeTab === "platform" ? (
            <PlatformPortalView />
          ) : (
            <div className="space-y-6">
              {health && (
                <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>
                      Service: {health.service} ({health.status})
                    </span>
                  </span>
                  <span className="text-emerald-700 font-mono text-[11px]">System Online</span>
                </div>
              )}
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-xl flex items-center justify-between text-xs text-rose-800">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>API Offline: {error}</span>
                  </span>
                  <span className="text-rose-700 font-mono text-[11px]">Service Unavailable</span>
                </div>
              )}

              {/* Recruitment Pipeline Stages Quick-Nav */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("pipeline")}
                  className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between text-xs text-left hover:border-slate-300 transition-colors"
                >
                  <div>
                    <span className="font-semibold text-slate-700 block">Applied</span>
                    <span className="text-[10px] text-slate-400">Stage 1: Inbound</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("pipeline")}
                  className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between text-xs text-left hover:border-slate-300 transition-colors"
                >
                  <div>
                    <span className="font-semibold text-sky-700 block">Screening</span>
                    <span className="text-[10px] text-slate-400">Stage 2: Review</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("pipeline")}
                  className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between text-xs text-left hover:border-slate-300 transition-colors"
                >
                  <div>
                    <span className="font-semibold text-purple-700 block">Interview</span>
                    <span className="text-[10px] text-slate-400">Stage 3: Evaluation</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("pipeline")}
                  className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between text-xs text-left hover:border-slate-300 transition-colors"
                >
                  <div>
                    <span className="font-semibold text-emerald-700 block">Hired</span>
                    <span className="text-[10px] text-slate-400">Stage 5: Finalized</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </button>
              </div>

              <DashboardView />
            </div>
          )}
        </main>
      </div>

      {/* Recruiter Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
};
