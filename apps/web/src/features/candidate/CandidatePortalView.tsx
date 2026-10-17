import React, { useState, useEffect } from "react";
import {
  User as UserIcon,
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Calendar,
  Video,
  Clock,
  Trash2,
  Download,
  RefreshCw,
} from "lucide-react";
import { fetchProfile, updateProfile, CandidateProfile } from "../../api/profileApi";
import { uploadResume, fetchMyResumes, deleteResume, ResumeItem } from "../../api/resumeApi";
import { analyzeResume, fetchMyAnalyses, AtsReport } from "../../api/atsApi";
import { fetchMyInterviews, InterviewItem } from "../../api/interviewApi";
import { fetchJobs } from "../../api/jobApi";
import { Job } from "../../types/job";

export const CandidatePortalView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"profile" | "resumes" | "ats" | "interviews">("profile");
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [analyses, setAnalyses] = useState<AtsReport[]>([]);
  const [interviews, setInterviews] = useState<InterviewItem[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Profile Edit State
  const [headline, setHeadline] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");

  // ATS Analysis State
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [currentAnalysis, setCurrentAnalysis] = useState<AtsReport | null>(null);

  // Load candidate data
  const loadData = async () => {
    try {
      setLoading(true);
      const [profileRes, resumesRes, analysesRes, interviewsRes, jobsRes] = await Promise.all([
        fetchProfile().catch(() => null),
        fetchMyResumes().catch(() => ({ success: true, data: { resumes: [] } })),
        fetchMyAnalyses().catch(() => ({ success: true, data: { analyses: [] } })),
        fetchMyInterviews().catch(() => ({ success: true, data: { interviews: [] } })),
        fetchJobs({ status: "Open" }).catch(() => ({ data: [] })),
      ]);

      if (profileRes?.data?.user) {
        setProfile(profileRes.data.user);
        setHeadline(profileRes.data.user.headline || "");
        setPhone(profileRes.data.user.phone || "");
        setBio(profileRes.data.user.bio || "");
        setSkills(profileRes.data.user.skills || []);
      }

      setResumes(resumesRes.data.resumes || []);
      setAnalyses(analysesRes.data.analyses || []);
      setInterviews(interviewsRes.data.interviews || []);
      setJobs(jobsRes.data || []);

      if (analysesRes.data.analyses?.length > 0) {
        setCurrentAnalysis((prev) => prev || analysesRes.data.analyses[0]);
      }
      if (jobsRes.data?.length > 0) {
        setSelectedJobId((prev) => prev || jobsRes.data[0].id);
      }
      if (resumesRes.data.resumes?.length > 0) {
        setSelectedResumeId((prev) => prev || resumesRes.data.resumes[0].id);
      }
    } catch (err) {
      console.error("Failed to load candidate portal data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await updateProfile({ headline, phone, bio, skills });
      setProfile(res.data.user);
      showNotification("Profile updated successfully!");
    } catch (err) {
      showNotification(err instanceof Error ? err.message : "Failed to update profile", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setActionLoading(true);
      const res = await uploadResume(file);
      setResumes([res.data.resume, ...resumes]);
      setSelectedResumeId(res.data.resume.id);
      showNotification(`Resume "${file.name}" uploaded and parsed successfully!`);
    } catch (err) {
      showNotification(err instanceof Error ? err.message : "Failed to upload resume", "error");
    } finally {
      setActionLoading(false);
      e.target.value = "";
    }
  };

  const handleDeleteResume = async (id: string) => {
    if (!confirm("Are you sure you want to remove this resume?")) return;
    try {
      await deleteResume(id);
      setResumes(resumes.filter((r) => r.id !== id));
      showNotification("Resume removed successfully.");
    } catch (err) {
      showNotification(err instanceof Error ? err.message : "Failed to delete resume", "error");
    }
  };

  const handleRunAnalysis = async () => {
    if (!selectedJobId) {
      showNotification("Please select a target job opening first.", "error");
      return;
    }

    try {
      setActionLoading(true);
      const res = await analyzeResume({
        jobId: selectedJobId,
        resumeId: selectedResumeId || undefined,
        forceRefresh: true,
      });
      setCurrentAnalysis(res.data.analysis);
      setAnalyses([res.data.analysis, ...analyses.filter((a) => a.id !== res.data.analysis.id)]);
      // Update selected resume status if it was completed via on-demand extraction
      if (selectedResumeId) {
        setResumes((prev) =>
          prev.map((r) =>
            r.id === selectedResumeId ? { ...r, parsingStatus: "completed", parsingError: null } : r
          )
        );
      }
      showNotification("ATS match score calculated successfully with local AI!");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to run analysis";
      if (errMsg.toLowerCase().includes("ollama") || errMsg.toLowerCase().includes("unreachable")) {
        showNotification(
          "Local AI service (Ollama) cannot be reached. Please ensure Ollama is running locally ('ollama serve').",
          "error"
        );
      } else {
        showNotification(errMsg, "error");
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-500">
          <RefreshCw className="w-5 h-5 animate-spin text-brand-600" />
          <span>Loading candidate portal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Toast Alert */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm shadow-md transition-all ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "bg-rose-50 text-rose-900 border border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {message.type === "success" ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-brand-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-200 text-xs font-semibold mb-2 backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-brand-300" />
            Candidate Self-Service & AI Match Workspace
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome, {profile?.name || "Candidate"}
          </h1>
          <p className="text-slate-300 text-sm mt-1">
            Manage your profile, analyze resume-to-job ATS match scores, and track interviews.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-center">
            <div className="text-xs text-slate-300">Resumes</div>
            <div className="text-lg font-bold">{resumes.length}</div>
          </div>
          <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-center">
            <div className="text-xs text-slate-300">Interviews</div>
            <div className="text-lg font-bold">{interviews.length}</div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 gap-2 overflow-x-auto">
        {[
          { id: "profile", label: "My Profile & Skills", icon: UserIcon },
          { id: "resumes", label: "My Resumes", icon: FileText, badge: resumes.length },
          { id: "ats", label: "AI ATS Analyzer", icon: Sparkles },
          { id: "interviews", label: "Interviews & Meet", icon: Calendar, badge: interviews.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? "border-brand-600 text-brand-600 font-semibold"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-brand-600" : "text-slate-400"}`} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 font-semibold">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Profile & Skills */}
      {activeTab === "profile" && (
        <div className="bg-white p-6 sm:p-8 rounded-b-xl border border-t-0 border-slate-200 shadow-sm">
          <form onSubmit={handleSaveProfile} className="space-y-6 max-w-3xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profile?.name || ""}
                  disabled
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed text-sm"
                />
                <span className="text-xs text-slate-400 mt-1 block">Account identity linked to login</span>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={profile?.email || ""}
                  disabled
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                  Professional Headline
                </label>
                <input
                  type="text"
                  placeholder="e.g. Senior Frontend Engineer | React & TypeScript"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-hidden text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-hidden text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                Candidate Bio & Background Summary
              </label>
              <textarea
                rows={4}
                placeholder="Describe your core expertise, recent projects, and what you're looking for..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-hidden text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                Technical & Domain Skills
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Type a skill and click Add (e.g. Next.js, Node.js, GraphQL)"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-hidden text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="px-4 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-medium text-sm"
                >
                  Add Skill
                </button>
              </div>

              <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-slate-50 rounded-xl border border-slate-200">
                {skills.length === 0 ? (
                  <span className="text-xs text-slate-400">No skills added yet.</span>
                ) : (
                  skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="hover:text-brand-900 rounded-full"
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={actionLoading}
                className="px-6 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 font-semibold text-sm shadow-sm transition-all disabled:opacity-50"
              >
                {actionLoading ? "Saving..." : "Save Profile Details"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: Resumes */}
      {activeTab === "resumes" && (
        <div className="bg-white p-6 sm:p-8 rounded-b-xl border border-t-0 border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Upload className="w-5 h-5 text-brand-600" />
                Upload New Resume
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Supported formats: PDF, DOCX, TXT. Content inspected via magic bytes; max 5MB.
              </p>
            </div>
            <label className="cursor-pointer px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2">
              <Upload className="w-4 h-4" />
              <span>Select File</span>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileUpload}
                disabled={actionLoading}
                className="hidden"
              />
            </label>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Uploaded Resumes ({resumes.length})
            </h4>

            {resumes.length === 0 ? (
              <div className="text-center py-12 border rounded-2xl border-slate-200 text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-medium">No resumes uploaded yet.</p>
                <p className="text-xs text-slate-400 mt-1">Upload a resume above to begin ATS match analysis.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {resumes.map((resume) => (
                  <div
                    key={resume.id}
                    className="p-5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all shadow-xs"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 text-sm">{resume.originalFilename}</h4>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                          <span>{(resume.fileSizeBytes / 1024).toFixed(1)} KB</span>
                          <span>•</span>
                          <span>Uploaded {new Date(resume.createdAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span
                            className={`px-2 py-0.5 rounded-full font-semibold ${
                              resume.parsingStatus === "completed"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {resume.parsingStatus === "completed" ? "Text Parsed" : "Parsing Pending"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <a
                        href={`/api/v1/resumes/${resume.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteResume(resume.id)}
                        className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ATS Match Analyzer */}
      {activeTab === "ats" && (() => {
        const selectedResume = resumes.find((r) => r.id === selectedResumeId) || resumes[0];
        const isCurrentAnalyzed =
          Boolean(currentAnalysis &&
          (typeof currentAnalysis.resumeId === "string"
            ? currentAnalysis.resumeId === selectedResume?.id
            : currentAnalysis.resumeId?.id === selectedResume?.id) &&
          (typeof currentAnalysis.jobId === "string"
            ? currentAnalysis.jobId === selectedJobId
            : currentAnalysis.jobId?.id === selectedJobId));

        return (
          <div className="bg-white p-6 sm:p-8 rounded-b-xl border border-t-0 border-slate-200 shadow-sm space-y-6">
            {/* Status & Guidance Banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border bg-slate-50 border-slate-200">
              <div className="flex items-center gap-2.5">
                {actionLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-brand-600" />
                    <span className="text-sm font-semibold text-brand-900">Analysis in progress</span>
                    <span className="text-xs text-brand-600 hidden md:inline">— Evaluating resume against job criteria using local Ollama model...</span>
                  </>
                ) : !selectedResume ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-semibold text-slate-700">No resume available</span>
                    <span className="text-xs text-slate-500 hidden md:inline">— Please upload a resume in the Resumes tab first.</span>
                  </>
                ) : selectedResume.parsingStatus === "failed" ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-semibold text-amber-900">Parsing issue detected</span>
                    <span className="text-xs text-amber-700 hidden md:inline">
                      — {selectedResume.parsingError || "No text extracted. If scanned PDF, OCR is required."}
                    </span>
                  </>
                ) : isCurrentAnalyzed ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-emerald-900">Analysis completed</span>
                    <span className="text-xs text-emerald-700 hidden md:inline">
                      — Evaluated with {currentAnalysis?.provider} ({currentAnalysis?.model})
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm font-semibold text-indigo-900">Ready for analysis</span>
                    <span className="text-xs text-indigo-700 hidden md:inline">— Resume verified. Click below to run local ATS match analysis.</span>
                  </>
                )}
              </div>

              {selectedResume?.parsingStatus === "failed" && (
                <button
                  type="button"
                  onClick={() => setActiveTab("resumes")}
                  className="text-xs font-semibold text-amber-800 underline hover:text-amber-950 shrink-0"
                >
                  Upload New Resume →
                </button>
              )}
            </div>

            {/* Controls Bar */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                  1. Select Job Opening
                </label>
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                >
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title} — {job.department}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                  2. Select Resume Version
                </label>
                <select
                  value={selectedResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                  disabled={resumes.length === 0}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-hidden disabled:bg-slate-100"
                >
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.originalFilename} ({new Date(r.createdAt).toLocaleDateString()})
                      {r.parsingStatus === "failed" ? " [Parsing Issue]" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleRunAnalysis}
                  disabled={actionLoading || resumes.length === 0}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-brand-700 hover:to-indigo-700 shadow-md transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {actionLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Analyzing with Local AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Calculate ATS Match Score</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          {/* Analysis Results Display */}
          {currentAnalysis ? (
            <div className="space-y-6">
              {/* Overall Score Card */}
              <div className="p-6 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    AI Resume-to-Job Fit Assessment
                  </div>
                  <h3 className="text-xl font-bold text-white">Overall ATS Alignment</h3>
                  <p className="text-slate-300 text-sm max-w-xl">{currentAnalysis.summary}</p>
                  <div className="text-xs text-slate-400 pt-1">
                    Evaluated with {currentAnalysis.provider} ({currentAnalysis.model}) • Advisory match indicator
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10 shrink-0 min-w-[160px]">
                  <div className="text-4xl sm:text-5xl font-black text-emerald-400">
                    {currentAnalysis.overallScore}%
                  </div>
                  <div className="text-xs uppercase font-semibold text-slate-300 mt-1">Match Score</div>
                </div>
              </div>

              {/* Rubric Breakdown Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Skills Evidence", score: currentAnalysis.breakdown.skillsScore },
                  { label: "Experience Alignment", score: currentAnalysis.breakdown.experienceScore },
                  { label: "Education & Foundations", score: currentAnalysis.breakdown.educationScore },
                  { label: "Role Relevance", score: currentAnalysis.breakdown.roleRelevanceScore },
                ].map((item) => (
                  <div key={item.label} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-xs text-slate-500 font-medium">{item.label}</div>
                    <div className="text-2xl font-bold text-slate-800 mt-1">{item.score}%</div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-brand-600 h-full rounded-full transition-all"
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Skills Evidenced vs Missing Criteria */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-3">
                  <h4 className="font-bold text-emerald-900 text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Required Skills Evidenced in Resume
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {currentAnalysis.requiredSkillsFound.map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-6 rounded-2xl border border-amber-200 bg-amber-50/50 space-y-3">
                  <h4 className="font-bold text-amber-900 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    Criteria Not Evidenced in Resume
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {currentAnalysis.missingCriteria.map((gap) => (
                      <span
                        key={gap}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200"
                      >
                        {gap}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Concrete Improvement Suggestions */}
              <div className="p-6 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-xs">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Concrete Resume Improvement Recommendations
                </h4>
                <ul className="space-y-2 text-sm text-slate-700">
                  {currentAnalysis.concreteSuggestions.map((suggestion, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 border rounded-2xl border-slate-200 text-slate-400">
              <Sparkles className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium">Select a job and resume above to view match breakdown.</p>
            </div>
          )}
        </div>
        );
      })()}

      {/* TAB 4: Interviews & Google Meet */}
      {activeTab === "interviews" && (
        <div className="bg-white p-6 sm:p-8 rounded-b-xl border border-t-0 border-slate-200 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-600" />
              Scheduled Candidate Interviews ({interviews.length})
            </h3>
          </div>

          {interviews.length === 0 ? (
            <div className="text-center py-12 border rounded-2xl border-slate-200 text-slate-400">
              <Calendar className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium">No interviews scheduled yet.</p>
              <p className="text-xs text-slate-400 mt-1">
                When recruiters advance your application, your Google Meet links will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {interviews.map((interview) => (
                <div
                  key={interview.id}
                  className="p-6 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          interview.status === "scheduled"
                            ? "bg-emerald-50 text-emerald-700"
                            : interview.status === "cancelled"
                            ? "bg-rose-50 text-rose-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {interview.status.toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-500">
                        {interview.jobId?.title || "Role Interview"}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-base">{interview.title}</h4>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(interview.scheduledStartTime).toLocaleString()} ({interview.timezone})
                      </span>
                    </div>
                    {interview.notes && (
                      <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        {interview.notes}
                      </p>
                    )}
                  </div>

                  {interview.status === "scheduled" && interview.googleMeetLink && (
                    <a
                      href={interview.googleMeetLink}
                      target="_blank"
                      rel="noreferrer"
                      className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl shadow-md flex items-center gap-2 transition-all shrink-0"
                    >
                      <Video className="w-4 h-4" />
                      <span>Join Google Meet</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
