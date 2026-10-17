import React, { useState, useEffect } from "react";
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
} from "lucide-react";

import { JobsView } from "../features/jobs/JobsView";
import { CandidatesView } from "../features/candidates/CandidatesView";
import { PipelineView } from "../features/pipeline/PipelineView";

import { DashboardView } from "../features/dashboard/DashboardView";

interface HealthStatus {
  status: string;
  service: string;
}

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"overview" | "jobs" | "candidates" | "pipeline">("overview");
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/health")
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

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 shadow-lg">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-500 flex items-center justify-center text-white font-bold shadow-md">
            EA
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">EarlyAI ATS</h1>
            <p className="text-xs text-slate-400">Recruiting Workspace</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5" aria-label="Main Navigation">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all text-left ${
              activeTab === "overview"
                ? "bg-brand-600 text-white shadow-sm"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("candidates")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all text-left ${
              activeTab === "candidates"
                ? "bg-brand-600 text-white shadow-sm"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Users className="w-5 h-5 text-slate-400" />
            <span>Candidates</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("jobs")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all text-left ${
              activeTab === "jobs"
                ? "bg-brand-600 text-white shadow-sm"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Briefcase className="w-5 h-5 text-slate-400" />
            <span>Jobs</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pipeline")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all text-left ${
              activeTab === "pipeline"
                ? "bg-brand-600 text-white shadow-sm"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Layers className="w-5 h-5 text-slate-400" />
            <span>Pipeline</span>
          </button>
          <a
            href="#reports"
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
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shadow-subtle shrink-0">
          {/* Search bar */}
          <div className="relative w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search candidates, jobs, or skills..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
            />
          </div>

          {/* Right Action Icons & User Dropdown */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
            </button>

            <div className="h-6 w-px bg-slate-200" />

            {/* User Profile */}
            <div className="flex items-center gap-3 pl-2">
              <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-semibold text-xs flex items-center justify-center border border-brand-200">
                JD
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium text-slate-800 leading-none">Jane Doe</p>
                <p className="text-xs text-slate-400 leading-none mt-1">Lead Recruiter</p>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-8 overflow-y-auto">
          {activeTab === "jobs" ? (
            <JobsView />
          ) : activeTab === "candidates" ? (
            <CandidatesView />
          ) : activeTab === "pipeline" ? (
            <PipelineView />
          ) : (
            <>
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
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-700 block">Applied</span>
                    <span className="text-[10px] text-slate-400">Stage 1: Inbound</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-sky-700 block">Screening</span>
                    <span className="text-[10px] text-slate-400">Stage 2: Review</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-purple-700 block">Interview</span>
                    <span className="text-[10px] text-slate-400">Stage 3: Evaluation</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-emerald-700 block">Hired</span>
                    <span className="text-[10px] text-slate-400">Stage 5: Finalized</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
              </div>

              <DashboardView />
            </>
          )}
        </main>
      </div>
    </div>
  );
};
