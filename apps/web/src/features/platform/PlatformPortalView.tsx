import React, { useState, useEffect } from "react";
import {
  Shield,
  Users,
  Cpu,
  Activity,
  RefreshCw,
  Search,
  Server,
  Zap,
} from "lucide-react";
import {
  fetchPlatformUsers,
  updatePlatformUserRole,
  fetchAIUsageMetrics,
  fetchSystemIntegrationsHealth,
  PlatformUser,
  AIUsageMetrics,
  SystemIntegrationsHealth,
} from "../../api/platformApi";

export const PlatformPortalView: React.FC = () => {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [metrics, setMetrics] = useState<AIUsageMetrics | null>(null);
  const [health, setHealth] = useState<SystemIntegrationsHealth | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, metricsRes, healthRes] = await Promise.all([
        fetchPlatformUsers().catch(() => ({ success: true, data: { users: [] } })),
        fetchAIUsageMetrics().catch(() => null),
        fetchSystemIntegrationsHealth().catch(() => null),
      ]);

      setUsers(usersRes.data.users || []);
      if (metricsRes?.data) setMetrics(metricsRes.data);
      if (healthRes?.data) setHealth(healthRes.data);
    } catch (err) {
      console.error("Failed to load platform data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      setActionLoading(true);
      const res = await updatePlatformUserRole(userId, newRole);
      setUsers(users.map((u) => (u.id === userId ? res.data.user : u)));
      setMessage({ text: `Updated ${res.data.user.name}'s role to ${newRole}`, type: "success" });
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to update role",
        type: "error",
      });
      setTimeout(() => setMessage(null), 4000);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-500">
          <RefreshCw className="w-5 h-5 animate-spin text-brand-600" />
          <span>Loading platform management portal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Toast Alert */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm shadow-md transition-all ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "bg-rose-50 text-rose-900 border border-rose-200"
          }`}
        >
          <span>{message.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-2 backdrop-blur-xs">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            Platform Manager Administration
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">System & Account Governance</h1>
          <p className="text-slate-300 text-sm mt-1">
            Supervise hiring team accounts, monitor AI provider token consumption, and inspect integration health.
          </p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-xl border border-white/15 flex items-center gap-2 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* System Integration Health Cards */}
      {health && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Database Engine</span>
              <Server className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-lg font-bold text-slate-900 capitalize">{health.database.status}</span>
            </div>
            <div className="text-xs text-slate-500">
              Cluster DB: <code className="bg-slate-100 px-1 py-0.5 rounded">{health.database.name}</code>
            </div>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">AI Provider Stack</span>
              <Cpu className="w-5 h-5 text-brand-600" />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-lg font-bold text-slate-900">
                Primary: {health.aiProviders.primary.toUpperCase()}
              </span>
            </div>
            <div className="text-xs text-slate-500">
              Gemini ({health.aiProviders.gemini.configured ? "Ready" : "Offline Fallback"}) • Groq (
              {health.aiProviders.groq.configured ? "Ready" : "Offline Fallback"})
            </div>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Google Calendar</span>
              <Activity className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  health.googleCalendar.configured ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              <span className="text-lg font-bold text-slate-900">
                {health.googleCalendar.configured ? "OAuth Ready" : "Manual Link Mode"}
              </span>
            </div>
            <div className="text-xs text-slate-500">
              Conference integration: {health.googleCalendar.conferenceIntegration}
            </div>
          </div>
        </div>
      )}

      {/* AI Telemetry & Usage Metrics */}
      {metrics && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Zap className="w-5 h-5 text-brand-600" />
              AI Telemetry & Token Consumption
            </h3>
            <span className="text-xs text-slate-500 font-medium">Recorded via server AIUsageRecord</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500 font-medium">Total AI Executions</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{metrics.totalCalls}</div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500 font-medium">Success Rate</div>
              <div className="text-2xl font-extrabold text-emerald-600 mt-1">
                {(100 - metrics.errorRate).toFixed(1)}%
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500 font-medium">Total Tokens Used</div>
              <div className="text-2xl font-extrabold text-indigo-600 mt-1">
                {(metrics.totalInputTokens + metrics.totalOutputTokens).toLocaleString()}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500 font-medium">Average Latency</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{metrics.avgLatencyMs} ms</div>
            </div>
          </div>
        </div>
      )}

      {/* User & Role Management Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-600" />
              User Accounts & Canonical Role Assignment
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Manage permissions across Candidates, Hiring Teams, and Platform Managers.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search user or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Current Role</th>
                <th className="px-6 py-4">Canonical Role</th>
                <th className="px-6 py-4">Assign Role</th>
                <th className="px-6 py-4">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{user.name}</div>
                      <div className="text-xs text-slate-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{user.role}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          user.canonicalRole === "platform_manager"
                            ? "bg-purple-100 text-purple-800"
                            : user.canonicalRole === "hiring_team"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {user.canonicalRole}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={user.role}
                        disabled={actionLoading}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-medium focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                      >
                        <option value="candidate">candidate</option>
                        <option value="hiring_team">hiring_team</option>
                        <option value="platform_manager">platform_manager</option>
                        <option value="recruiter">recruiter (legacy)</option>
                        <option value="hiring_manager">hiring_manager (legacy)</option>
                        <option value="admin">admin (legacy)</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
