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
  Clock,
  UserCheck,
  XCircle,
  FileText,
  Activity,
} from "lucide-react";

import { JobsView } from "../features/jobs/JobsView";
import { CandidatesView } from "../features/candidates/CandidatesView";

interface HealthStatus {
  status: string;
  service: string;
}

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"overview" | "jobs" | "candidates">("overview");
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
          <a
            href="#pipeline"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white font-medium transition-all"
          >
            <Layers className="w-5 h-5 text-slate-400" />
            <span>Pipeline</span>
          </a>
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
          ) : (
            <>
              {/* Page Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Overview & Pipeline Health</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Phase 1 project skeleton & shared design tokens initialized.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="px-4 py-2 bg-white text-slate-700 border border-slate-300 font-medium text-sm rounded-lg hover:bg-slate-50 transition-all shadow-subtle"
                  >
                    Documentation
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("jobs")}
                    className="px-4 py-2 bg-brand-600 text-white font-medium text-sm rounded-lg hover:bg-brand-700 transition-all shadow-sm flex items-center gap-2"
                  >
                    <Briefcase className="w-4 h-4" />
                    <span>Manage Jobs</span>
                  </button>
                </div>
              </div>

              {/* API Verification Banner */}
              <div className="mb-8 p-4 rounded-xl border border-blue-100 bg-blue-50/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Backend Health Endpoint</p>
                    <p className="text-xs text-blue-700 mt-0.5">
                      Target: <code className="bg-blue-100 px-1 py-0.5 rounded">/api/v1/health</code>
                    </p>
                  </div>
                </div>

                <div>
                  {loading && <span className="text-xs text-slate-500">Checking health...</span>}
                  {health && (
                    <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>
                        Service: {health.service} ({health.status})
                      </span>
                    </div>
                  )}
                  {error && (
                    <div className="flex items-center gap-2 text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-medium">
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>Offline ({error})</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Shared Styling Tokens & Metric Card Skeleton Previews */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-card">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Applied</span>
                    <span className="p-2 rounded-lg bg-slate-100 text-slate-600">
                      <Clock className="w-4 h-4" />
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">0</p>
                  <p className="text-xs text-slate-400 mt-1">Stage 1: Inbound applications</p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-card">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-sky-600 uppercase tracking-wider">Screening</span>
                    <span className="p-2 rounded-lg bg-sky-50 text-sky-600">
                      <Search className="w-4 h-4" />
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">0</p>
                  <p className="text-xs text-slate-400 mt-1">Stage 2: Recruiter review</p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-card">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Interview</span>
                    <span className="p-2 rounded-lg bg-purple-50 text-purple-600">
                      <Users className="w-4 h-4" />
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">0</p>
                  <p className="text-xs text-slate-400 mt-1">Stage 3: Technical / Team rounds</p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-card">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Hired</span>
                    <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                      <UserCheck className="w-4 h-4" />
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">0</p>
                  <p className="text-xs text-slate-400 mt-1">Stage 5: Terminal hire</p>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};
