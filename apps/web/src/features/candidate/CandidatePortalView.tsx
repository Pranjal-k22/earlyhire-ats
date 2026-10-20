import React, { useState, useEffect, useRef } from "react";
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
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Send,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Bookmark,
  Inbox,
  Award,
} from "lucide-react";
import { fetchProfile, updateProfile, CandidateProfile } from "../../api/profileApi";
import { uploadResume, fetchMyResumes, deleteResume, ResumeItem } from "../../api/resumeApi";
import { NotificationsDropdown } from "../notifications/NotificationsDropdown";
import { analyzeResume, fetchMyAnalyses, AtsReport } from "../../api/atsApi";
import { fetchMyInterviews, InterviewItem } from "../../api/interviewApi";
import { fetchJobs } from "../../api/jobApi";
import { applyForJobApi, fetchApplications } from "../../api/applicationApi";
import { Job } from "../../types/job";
import { Application } from "../../types/application";
import { fetchMyOffers, respondToOffer } from "../../api/offerApi";
import { Offer } from "../../types/offer";
import { useRealtimeAnalytics } from "../dashboard/useRealtimeAnalytics";

// Segmented Circular Radial Gauge matching Jobflow reference
const RadialSegmentedGauge: React.FC<{ score: number }> = ({ score }) => {
  const totalTicks = 36;
  const activeTicks = Math.round((Math.min(100, Math.max(0, score)) / 100) * totalTicks);
  const size = 180;
  const center = size / 2;
  const rInner = 56;
  const rOuter = 72;

  return (
    <div className="relative flex items-center justify-center w-44 h-44 mx-auto">
      <svg width={size} height={size} className="transform -rotate-90">
        {Array.from({ length: totalTicks }).map((_, i) => {
          const angle = (i * 360) / totalTicks;
          const rad = (angle * Math.PI) / 180;
          const x1 = center + rInner * Math.cos(rad);
          const y1 = center + rInner * Math.sin(rad);
          const x2 = center + rOuter * Math.cos(rad);
          const y2 = center + rOuter * Math.sin(rad);
          const isActive = i < activeTicks;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isActive ? "#6366F1" : "#E2E8F0"}
              strokeWidth="3.5"
              strokeLinecap="round"
              className="transition-all duration-300"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Resume Strength
        </span>
        <span className="text-3xl font-extrabold text-slate-800 tracking-tight mt-0.5">
          {score}%
        </span>
      </div>
    </div>
  );
};

export const CandidatePortalView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "profile" | "resumes" | "ats" | "interviews" | "offers"
  >("dashboard");
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [analyses, setAnalyses] = useState<AtsReport[]>([]);
  const [interviews, setInterviews] = useState<InterviewItem[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [respondingOfferId, setRespondingOfferId] = useState<string | null>(null);
  const [candidateOfferNotes, setCandidateOfferNotes] = useState<Record<string, string>>({});
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

  // Application Submission State
  const [isApplyModalOpen, setIsApplyModalOpen] = useState<boolean>(false);
  const [applicationNotes, setApplicationNotes] = useState<string>("");
  const [applyLoading, setApplyLoading] = useState<boolean>(false);

  // Application table filters
  const [appSearchQuery, setAppSearchQuery] = useState<string>("");
  const [bookmarkedJobs, setBookmarkedJobs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load candidate data
  const loadData = async () => {
    try {
      setLoading(true);
      const [profileRes, resumesRes, analysesRes, interviewsRes, jobsRes, applicationsRes, offersRes] = await Promise.all([
        fetchProfile().catch(() => null),
        fetchMyResumes().catch(() => ({ success: true, data: { resumes: [] } })),
        fetchMyAnalyses().catch(() => ({ success: true, data: { analyses: [] } })),
        fetchMyInterviews().catch(() => ({ success: true, data: { interviews: [] } })),
        fetchJobs({ status: "Open" }).catch(() => ({ data: [] })),
        fetchApplications({ limit: 50 }).catch(() => ({ success: true, data: { applications: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 1 } } })),
        fetchMyOffers().catch(() => ({ success: true, data: [] })),
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
      setApplications(applicationsRes.data.applications || []);
      setOffers(Array.isArray(offersRes?.data) ? offersRes.data : []);

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

  // Real-time updates via SSE subscription
  useRealtimeAnalytics({
    enabled: true,
    onInvalidate: () => {
      loadData();
    },
  });

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleRespondToOffer = async (offerId: string, response: "Accepted" | "Declined") => {
    try {
      setActionLoading(true);
      setRespondingOfferId(offerId);
      const notes = candidateOfferNotes[offerId] || undefined;
      await respondToOffer(offerId, { response, notes });
      showNotification(
        response === "Accepted"
          ? "Congratulations! You accepted the offer. Your application status is now Hired!"
          : "You have declined the offer."
      );
      await loadData();
    } catch (err) {
      showNotification(err instanceof Error ? err.message : "Failed to respond to offer", "error");
    } finally {
      setActionLoading(false);
      setRespondingOfferId(null);
    }
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
      showNotification("ATS match score calculated successfully with Groq / Gemini AI!");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to run analysis";
      if (
        errMsg.toLowerCase().includes("unreachable") ||
        errMsg.toLowerCase().includes("rate limit") ||
        errMsg.toLowerCase().includes("quota")
      ) {
        showNotification(
          "AI scoring service (Groq / Gemini) could not complete evaluation right now. Please check API keys or connection.",
          "error"
        );
      } else {
        showNotification(errMsg, "error");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitApplication = async () => {
    if (!selectedJobId) {
      showNotification("Please select a target job opening first.", "error");
      return;
    }
    if (!selectedResumeId) {
      showNotification("Please select a resume version first.", "error");
      return;
    }

    try {
      setApplyLoading(true);
      await applyForJobApi({
        jobId: selectedJobId,
        resumeId: selectedResumeId,
        notes: applicationNotes.trim() || undefined,
      });

      showNotification("Application submitted successfully! Your immutable ATS snapshot has been recorded.");
      setIsApplyModalOpen(false);
      setApplicationNotes("");
      loadData();
    } catch (err) {
      showNotification(err instanceof Error ? err.message : "Failed to submit application", "error");
    } finally {
      setApplyLoading(false);
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

      {/* Top Header Bar (Jobflow Style) */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome Back, {profile?.name || "Rayden"}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Your Career Journey Starts Here. Track and Manage Your Applications Seamlessly.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Search Input Bar */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search..."
              value={appSearchQuery}
              onChange={(e) => setAppSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
            />
          </div>

          {/* Notification Bell */}
          <NotificationsDropdown />

          {/* Hidden File Input for Direct Upload */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf,.docx,.txt"
            onChange={handleFileUpload}
            disabled={actionLoading}
            className="hidden"
          />

          {/* Post Resume Primary Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={actionLoading}
            className="px-4 sm:px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            <span>{actionLoading ? "Uploading..." : "Post Resume"}</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 bg-white/70 backdrop-blur-md rounded-2xl px-4 pt-2 gap-2 overflow-x-auto shadow-2xs">
        {[
          { id: "dashboard", label: "Dashboard", icon: Sparkles },
          { id: "profile", label: "My Profile & Skills", icon: UserIcon },
          { id: "resumes", label: "My Resumes", icon: FileText, badge: resumes.length },
          { id: "ats", label: "AI ATS Analyzer", icon: Sparkles },
          { id: "interviews", label: "Interviews & Meet", icon: Calendar, badge: interviews.length },
          {
            id: "offers",
            label: "Job Offers",
            icon: Award,
            badge: offers.filter((o) => o.status === "Extended").length,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 font-semibold text-xs sm:text-sm border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "border-purple-600 text-purple-700"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-purple-600" : "text-slate-400"}`} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-purple-50 text-purple-700 font-bold border border-purple-200">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 0: Jobflow Candidate Dashboard */}
      {activeTab === "dashboard" && (() => {
        const candidateScore = currentAnalysis?.overallScore || 85;
        const profileScore = currentAnalysis?.breakdown.roleRelevanceScore || 85;
        const workScore = currentAnalysis?.breakdown.experienceScore || 90;
        const skillScore = currentAnalysis?.breakdown.skillsScore || 85;
        const eduScore = currentAnalysis?.breakdown.educationScore || 80;

        // Real applications filtered for search
        const realApplications = applications.filter(
          (a) =>
            !appSearchQuery ||
            (a.jobId?.title || "").toLowerCase().includes(appSearchQuery.toLowerCase()) ||
            (a.jobId?.department || "").toLowerCase().includes(appSearchQuery.toLowerCase()) ||
            (a.currentStage || "").toLowerCase().includes(appSearchQuery.toLowerCase())
        );

        const totalSentCount = applications.length;
        const activeCount = applications.filter((a) => a.status === "Active" && a.currentStage !== "Hired" && a.currentStage !== "Rejected").length;
        const interviewCount = applications.filter((a) => a.currentStage === "Interview" || a.currentStage === "Screening").length;
        const offerCount = applications.filter((a) => a.currentStage === "Offer" || a.currentStage === "Hired").length;

        return (
          <div className="space-y-6">
            {/* Active Job Offers Notification Banner */}
            {offers.some((o) => o.status === "Extended") && (
              <div className="bg-gradient-to-r from-amber-500 via-emerald-600 to-teal-600 text-white p-5 rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider">
                    <Award className="w-3.5 h-3.5" />
                    <span>Official Offer Waiting</span>
                  </div>
                  <h3 className="text-lg font-bold">You have an active job offer to review!</h3>
                  <p className="text-xs text-white/90">
                    Review compensation, proposed start date, terms, and submit your formal acceptance.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("offers")}
                  className="px-5 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-bold text-xs shadow-xs transition-colors shrink-0 cursor-pointer"
                >
                  View & Respond to Offer →
                </button>
              </div>
            )}

            {/* Top Grid: 4 Metric Cards + Schedule Widget */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Left 4-grid Stat Cards */}
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Total Applications Sent (Featured Purple Gradient) */}
                <div className="bg-gradient-to-br from-[#5B46E8] to-[#805BF8] text-white p-5 rounded-2xl shadow-md relative overflow-hidden flex flex-col justify-between min-h-[160px]">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white backdrop-blur-xs">
                      <Upload className="w-5 h-5" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("ats")}
                      className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all cursor-pointer"
                      title="View submitted applications"
                      aria-label="View submitted applications"
                    >
                      <ArrowRight className="w-4 h-4 -rotate-45" />
                    </button>
                  </div>
                  <div>
                    <div className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                      {totalSentCount}
                    </div>
                    <div className="text-sm font-bold text-white/95 mt-1">Total Applications Sent</div>
                    <p className="text-[11px] text-white/70 mt-0.5">Your submitted applications</p>
                  </div>
                </div>

                {/* 2. Active Applications */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between min-h-[160px]">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                      <Inbox className="w-5 h-5" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("ats")}
                      className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-all cursor-pointer"
                      title="View active applications"
                      aria-label="View active applications"
                    >
                      <ArrowRight className="w-4 h-4 -rotate-45" />
                    </button>
                  </div>
                  <div>
                    <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">{activeCount}</div>
                    <div className="text-sm font-bold text-slate-800 mt-1">Active Applications</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Ongoing applications in review</p>
                  </div>
                </div>

                {/* 3. Waiting for Interview */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between min-h-[160px]">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("interviews")}
                      className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-all cursor-pointer"
                      title="View scheduled interviews"
                      aria-label="View scheduled interviews"
                    >
                      <ArrowRight className="w-4 h-4 -rotate-45" />
                    </button>
                  </div>
                  <div>
                    <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                      {interviewCount}
                    </div>
                    <div className="text-sm font-bold text-slate-800 mt-1">Waiting for Interview</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Applications in screening/interview</p>
                  </div>
                </div>

                {/* 4. Offer Received */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between min-h-[160px]">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                      <Award className="w-5 h-5" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("ats")}
                      className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-all cursor-pointer"
                      title="View job offers"
                      aria-label="View job offers"
                    >
                      <ArrowRight className="w-4 h-4 -rotate-45" />
                    </button>
                  </div>
                  <div>
                    <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">{offerCount}</div>
                    <div className="text-sm font-bold text-slate-800 mt-1">Offer Received</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Job offers and completed placements</p>
                  </div>
                </div>
              </div>

              {/* Right Schedule Widget (Jobflow Style) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">Schedule</h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                      aria-label="Search schedule"
                    >
                      <Search className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200/80">
                      <ChevronLeft className="w-3 h-3 text-slate-400 cursor-pointer" />
                      <span>November 2024</span>
                      <ChevronRight className="w-3 h-3 text-slate-400 cursor-pointer" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {interviews.length > 0 ? (
                    interviews.slice(0, 3).map((evt, idx) => {
                      const d = new Date(evt.scheduledStartTime);
                      const dateNum = isNaN(d.getTime()) ? "—" : String(d.getDate());
                      const dayName = isNaN(d.getTime()) ? "TBD" : d.toLocaleDateString(undefined, { weekday: "short" });
                      const timeStr = isNaN(d.getTime()) ? "Scheduled" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                      return (
                        <div
                          key={evt.id || idx}
                          className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-purple-200 bg-slate-50/50 hover:bg-purple-50/30 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl border-2 border-purple-200 bg-white text-purple-700 flex flex-col items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                              <span>{dateNum}</span>
                              <span className="text-[9px] uppercase font-semibold text-purple-500 leading-none">
                                {dayName}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">
                                {evt.jobId?.title || evt.title || "Interview Session"}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                {evt.meetingType === "google_meet" ? "Google Meet" : "Interview"} • {timeStr}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setActiveTab("interviews")}
                            className="w-7 h-7 rounded-full bg-white hover:bg-purple-100 text-slate-400 hover:text-purple-600 flex items-center justify-center border border-slate-200/80 transition-colors shrink-0"
                            aria-label="View interview details"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-6 px-3 bg-slate-50/70 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                      <Calendar className="w-6 h-6 mx-auto mb-1.5 text-slate-300" />
                      <span>No upcoming interview sessions yet.</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab("interviews")}
                  className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200/80 transition-colors cursor-pointer"
                >
                  See All
                </button>
              </div>
            </div>

            {/* Middle Grid: Resume Strength Analyzer (Left) + Latest Application Status (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Resume Strength Analyzer (Image 1 Left) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">Resume Strength Analyzer</h3>
                  <span className="text-[11px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                    AI Powered
                  </span>
                </div>

                {/* Segmented Radial Gauge */}
                <RadialSegmentedGauge score={candidateScore} />

                {/* Rubric Breakdown Progress Bars */}
                <div className="space-y-3 pt-1 text-xs">
                  {[
                    { label: "Profile Summary", score: profileScore },
                    { label: "Work Experience", score: workScore },
                    { label: "Skill Section", score: skillScore },
                    { label: "Education", score: eduScore },
                  ].map((rubric) => (
                    <div key={rubric.label} className="space-y-1">
                      <div className="flex justify-between text-slate-600 font-medium">
                        <span>{rubric.label}</span>
                        <span className="font-bold text-slate-800">{rubric.score}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-purple-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${rubric.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions: Download Resume & Improve */}
                <div className="space-y-2 pt-1">
                  {resumes.length > 0 && (
                    <a
                      href={`/api/v1/resumes/${resumes[0].id}/download`}
                      download={resumes[0].originalFilename}
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
                      title="Download your active resume PDF file"
                    >
                      <Download className="w-4 h-4 text-purple-600" />
                      <span>Download Resume (PDF)</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveTab("ats")}
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Improve Resume
                  </button>
                </div>
              </div>

              {/* Latest Application Status Table (Image 1 Right) */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <h3 className="font-bold text-slate-900 text-sm">Latest Application Status</h3>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-48">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search..."
                        value={appSearchQuery}
                        onChange={(e) => setAppSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <button
                      type="button"
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg border border-slate-200 flex items-center gap-1.5 shrink-0"
                    >
                      <Filter className="w-3.5 h-3.5 text-slate-500" />
                      <span>Filter</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                        <th className="py-2.5 px-3 w-8">
                          <input type="checkbox" className="rounded border-slate-300 text-purple-600" />
                        </th>
                        <th className="py-2.5 px-3">Role & Job Opening</th>
                        <th className="py-2.5 px-3">Department</th>
                        <th className="py-2.5 px-3">Stage</th>
                        <th className="py-2.5 px-3">Applied On</th>
                        <th className="py-2.5 px-3 text-right">ATS Match</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {realApplications.length > 0 ? (
                        realApplications.map((app) => {
                          const jobTitle = app.jobId?.title || "Job Opening";
                          const dept = app.jobId?.department || "General";
                          const loc = app.jobId?.location || "Remote";
                          const stage = app.currentStage || app.stage || "Applied";
                          const appliedDate = app.appliedAt
                            ? new Date(app.appliedAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "Recently";

                          let badgeColor = "bg-slate-100 text-slate-700 border-slate-200";
                          if (stage === "Screening") badgeColor = "bg-blue-50 text-blue-700 border-blue-200";
                          if (stage === "Interview") badgeColor = "bg-purple-50 text-purple-700 border-purple-200";
                          if (stage === "Offer") badgeColor = "bg-amber-50 text-amber-700 border-amber-200";
                          if (stage === "Hired") badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                          if (stage === "Rejected") badgeColor = "bg-rose-50 text-rose-700 border-rose-200";

                          const atsScore = app.atsSnapshot?.overallScore;

                          return (
                            <tr key={app.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3 px-3">
                                <input type="checkbox" className="rounded border-slate-300 text-purple-600" />
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0"
                                  >
                                    {jobTitle[0]}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-bold text-slate-800 truncate max-w-[200px]">{jobTitle}</div>
                                    <div className="text-[10px] text-slate-400">{loc}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-3 font-medium text-slate-700">{dept}</td>
                              <td className="py-3 px-3">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badgeColor}`}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                  {stage}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-slate-500 whitespace-nowrap">{appliedDate}</td>
                              <td className="py-3 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {atsScore !== undefined && (
                                    <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                                      ATS {atsScore}/100
                                    </span>
                                  )}
                                  {(() => {
                                    const resId =
                                      typeof app.resumeId === "object" && app.resumeId
                                        ? (app.resumeId.id || (app.resumeId as { _id?: string })._id)
                                        : typeof app.resumeId === "string"
                                        ? app.resumeId
                                        : null;
                                    return resId ? (
                                      <a
                                        href={`/api/v1/resumes/${resId}/download`}
                                        download
                                        className="p-1 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                                        title="Download submitted resume PDF"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                      </a>
                                    ) : null;
                                  })()}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-slate-400 text-xs">
                            <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                            <p className="font-semibold text-slate-600">No applications submitted yet</p>
                            <p className="text-slate-400 text-[11px] mt-0.5">Explore open jobs and apply with your parsed resume to track application status.</p>
                            <button
                              type="button"
                              onClick={() => setActiveTab("ats")}
                              className="mt-3 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                            >
                              Explore Open Jobs
                            </button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer Pagination */}
                <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
                  <span>Page 1 of 12</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="p-1 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className="p-1 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                      aria-label="Next page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row: Recommended Jobs (Jobflow Reference) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-base">Recommended Jobs</h3>
                <button
                  type="button"
                  onClick={() => setActiveTab("ats")}
                  className="text-xs font-semibold text-purple-600 hover:text-purple-800"
                >
                  See All
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {jobs.length > 0 ? (
                  jobs.slice(0, 3).map((job) => {
                    const isBookmarked = bookmarkedJobs.includes(job.id);
                    return (
                      <div
                        key={job.id}
                        className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:shadow-md transition-all group"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100">
                            {job.employmentType || "Full-time"}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (isBookmarked) {
                                setBookmarkedJobs(bookmarkedJobs.filter((id) => id !== job.id));
                              } else {
                                setBookmarkedJobs([...bookmarkedJobs, job.id]);
                              }
                            }}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isBookmarked
                                ? "bg-purple-50 text-purple-600 border-purple-200"
                                : "text-slate-400 hover:text-slate-600 border-slate-200"
                            }`}
                            aria-label="Bookmark job"
                          >
                            <Bookmark className="w-3.5 h-3.5 fill-current" />
                          </button>
                        </div>

                        <div className="space-y-1 mb-4">
                          <h4 className="font-bold text-slate-800 text-sm group-hover:text-purple-600 transition-colors">
                            {job.title}
                          </h4>
                          <p className="text-xs text-slate-500">{job.department} • {job.location}</p>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                          <div
                            className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs"
                          >
                            {job.title[0]}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab("ats");
                              setSelectedJobId(job.id);
                            }}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-purple-600 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                          >
                            Apply Now
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-3 text-center py-6 text-slate-400 text-xs">
                    No open positions available at this time.
                  </div>
                )}
              </div>
            </div>

            {/* Behavioral Interviews Promo Banner (Image 1 Left Sidebar / Lower Widget) */}
            <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-slate-900 text-white p-6 rounded-2xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 max-w-xl">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/10 text-purple-200 text-xs font-semibold backdrop-blur-xs">
                  <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                  Interview Preparation Guide
                </div>
                <h4 className="text-base font-bold text-white">Mastering Behavioral Interviews</h4>
                <p className="text-xs text-slate-300">
                  Strategies to succeed in competency-based interviews. Learn the STAR framework and optimize your communication.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("interviews")}
                className="px-5 py-2.5 bg-white text-purple-900 hover:bg-purple-50 text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <span>Learn More</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })()}

      {/* TAB 1: Profile & Skills */}
      {activeTab === "profile" && (
        <div className="glass-card p-6 sm:p-8 rounded-b-2xl border-t-0 shadow-sm">
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
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-500 hover:opacity-95 text-white rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? "Saving..." : "Save Profile Details"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: Resumes */}
      {activeTab === "resumes" && (
        <div className="glass-card p-6 sm:p-8 rounded-b-2xl border-t-0 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 bg-purple-50/40 rounded-2xl border border-dashed border-purple-200/80">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Upload className="w-5 h-5 text-purple-600" />
                Upload New Resume
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Supported formats: PDF, DOCX, TXT. Content inspected via magic bytes; max 5MB.
              </p>
            </div>
            <label className="cursor-pointer px-5 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-500 hover:opacity-95 text-white text-sm font-semibold rounded-xl shadow-md transition-all flex items-center gap-2">
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
                        href={`/api/v1/resumes/${resume.id}/download?inline=true`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 text-brand-600 hover:text-brand-800 hover:bg-brand-50 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-brand-200 transition-all"
                        title="View resume PDF directly in browser"
                      >
                        <FileText className="w-4 h-4" />
                        <span>View PDF</span>
                      </a>
                      <a
                        href={`/api/v1/resumes/${resume.id}/download`}
                        download={resume.originalFilename}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-purple-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs"
                        title="Download resume in PDF format"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download PDF</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteResume(resume.id)}
                        className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                        title="Delete resume"
                      >
                        <Trash2 className="w-4 h-4" />
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
          <div className="glass-card p-6 sm:p-8 rounded-b-2xl border-t-0 shadow-sm space-y-6">
            {/* Status & Guidance Banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border bg-purple-50/30 border-purple-100/60">
              <div className="flex items-center gap-2.5">
                {actionLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
                    <span className="text-sm font-semibold text-purple-900">Analysis in progress</span>
                    <span className="text-xs text-purple-600 hidden md:inline">— Evaluating resume against job criteria using Groq / Gemini AI...</span>
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
                  className="text-xs font-semibold text-amber-800 underline hover:text-amber-950 shrink-0 cursor-pointer"
                >
                  Upload New Resume →
                </button>
              )}
            </div>

            {/* Controls Bar */}
            <div className="p-6 bg-white/70 backdrop-blur-md rounded-2xl border border-purple-100/60 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                  1. Select Job Opening
                </label>
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
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
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-purple-500 focus:outline-hidden disabled:bg-slate-100"
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
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-500 text-white font-semibold rounded-xl hover:opacity-95 shadow-md transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
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
              <div className="p-6 bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-purple-800/40">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    AI Resume-to-Job Fit Assessment
                  </div>
                  <h3 className="text-xl font-bold text-white">Overall ATS Alignment</h3>
                  <p className="text-slate-300 text-sm max-w-xl">{currentAnalysis.summary}</p>
                  <div className="text-xs text-purple-300 pt-1">
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
                  <div key={item.label} className="p-4 bg-white/80 rounded-xl border border-purple-100/60 shadow-2xs">
                    <div className="text-xs text-slate-500 font-medium">{item.label}</div>
                    <div className="text-2xl font-bold text-slate-800 mt-1">{item.score}%</div>
                    <div className="w-full bg-slate-200/80 h-2 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-purple-600 to-teal-400 h-full rounded-full transition-all"
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

              {/* Resume Version Comparison (if multiple analyses exist for this job) */}
              {(() => {
                const jobAnalyses = analyses.filter((a) => {
                  const jId = typeof a.jobId === "string" ? a.jobId : a.jobId?.id;
                  return jId === selectedJobId;
                });
                const previousAnalysis = jobAnalyses.find((a) => a.id !== currentAnalysis.id);
                if (!previousAnalysis) return null;
                const delta = currentAnalysis.overallScore - previousAnalysis.overallScore;

                return (
                  <div className="p-5 rounded-2xl border border-indigo-100 bg-indigo-50/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-indigo-600" />
                        <h4 className="font-bold text-slate-900 text-sm">Resume Version Comparison</h4>
                      </div>
                      <p className="text-xs text-slate-600">
                        Comparing current assessment with previously generated report for this opening.
                      </p>
                    </div>
                    <div className="flex items-center gap-4 bg-white px-4 py-2.5 rounded-xl border border-indigo-200/60 shadow-2xs">
                      <div className="text-center">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Prior Check</span>
                        <span className="text-sm font-bold text-slate-600">{previousAnalysis.overallScore}%</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                      <div className="text-center">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Current Check</span>
                        <span className="text-sm font-bold text-brand-600">{currentAnalysis.overallScore}%</span>
                      </div>
                      <div className="pl-2 border-l border-slate-200 text-center">
                        <span className="text-[10px] uppercase font-semibold block text-slate-400">Delta</span>
                        <span
                          className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
                            delta >= 0
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {delta >= 0 ? `+${delta}%` : `${delta}%`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Low-Score Coaching Panel (< 70% Advisory Target) */}
              {currentAnalysis.overallScore < 70 && (
                <div className="p-6 rounded-2xl border-2 border-amber-300 bg-amber-50/70 space-y-4 shadow-xs">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-200 text-amber-900 text-xs font-bold">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                        Resume Optimization Coaching Panel (Score &lt; 70%)
                      </div>
                      <h4 className="text-base font-bold text-amber-950 pt-1">
                        How to Strengthen Your Match Before Submitting
                      </h4>
                      <p className="text-xs text-amber-900/80 leading-relaxed max-w-3xl">
                        This score is an advisory estimate intended to help you present your best qualifications. In EarlyAI ATS, you are <strong>never blocked or auto-rejected</strong> from applying with any score. However, addressing the missing evidence below will ensure recruiters see your full potential.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="bg-white/80 p-3.5 rounded-xl border border-amber-200/80 text-xs space-y-1">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        1. Quantify Impact with Numbers
                      </div>
                      <p className="text-slate-600">
                        Add metrics (e.g., latency reduction, users handled, team size, % speedup) to projects.
                      </p>
                    </div>
                    <div className="bg-white/80 p-3.5 rounded-xl border border-amber-200/80 text-xs space-y-1">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        2. Clarify Missing Skills Truthfully
                      </div>
                      <p className="text-slate-600">
                        If you have experience with required skills ({currentAnalysis.missingCriteria.slice(0, 3).join(", ") || "technologies"}), explicitly mention them. Never invent qualifications.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab("resumes")}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Improved Resume Version</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRunAnalysis}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? "animate-spin" : ""}`} />
                      <span>Recheck Compatibility Score</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsApplyModalOpen(true)}
                      className="px-4 py-2 text-amber-900 hover:text-amber-950 font-semibold text-xs ml-auto cursor-pointer underline"
                    >
                      Continue to Application Anyway →
                    </button>
                  </div>
                </div>
              )}

              {/* Ready to Apply Submission Banner */}
              <div className="p-6 bg-gradient-to-r from-purple-950/90 via-indigo-950/90 to-slate-900/90 text-white rounded-2xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border border-purple-800/40">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 text-xs font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Immutable ATS Snapshot Included
                  </div>
                  <h4 className="text-lg font-bold text-white">Apply for this Job Opening</h4>
                  <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                    Submitting your application binds an immutable ATS snapshot ({currentAnalysis.overallScore}%) from resume{" "}
                    <strong>{selectedResume?.originalFilename}</strong>. Recruiters use this assessment as decision support alongside their human review.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(true)}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-500 hover:opacity-95 text-white font-bold rounded-xl shadow-lg transition-all text-sm flex items-center gap-2 shrink-0 cursor-pointer"
                >
                  <span>Submit Application</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 border rounded-2xl border-purple-100/60 bg-white/40 text-slate-400">
              <Sparkles className="w-12 h-12 mx-auto mb-2 text-purple-300" />
              <p className="text-sm font-medium">Select a job and resume above to view match breakdown.</p>
            </div>
          )}
        </div>
        );
      })()}

      {/* TAB 4: Interviews & Google Meet */}
      {activeTab === "interviews" && (
        <div className="glass-card p-6 sm:p-8 rounded-b-2xl border-t-0 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              Scheduled Candidate Interviews ({interviews.length})
            </h3>
          </div>

          {interviews.length === 0 ? (
            <div className="text-center py-12 border rounded-2xl border-purple-100/60 bg-white/40 text-slate-400">
              <Calendar className="w-12 h-12 mx-auto mb-2 text-purple-300" />
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
                  className="p-6 rounded-2xl border border-purple-100/60 bg-white/80 hover:bg-white shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all"
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
                      className="px-5 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-500 hover:opacity-95 text-white text-sm font-semibold rounded-xl shadow-md flex items-center gap-2 transition-all shrink-0 cursor-pointer"
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

      {/* TAB 5: Job Offers & Accept/Decline */}
      {activeTab === "offers" && (
        <div className="glass-card p-6 sm:p-8 rounded-b-2xl border-t-0 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" />
              Official Employment Offers ({offers.length})
            </h3>
          </div>

          {offers.length === 0 ? (
            <div className="text-center py-12 border rounded-2xl border-purple-100/60 bg-white/40 text-slate-400">
              <Award className="w-12 h-12 mx-auto mb-2 text-indigo-300" />
              <p className="text-sm font-medium">No employment offers extended yet.</p>
              <p className="text-xs text-slate-400 mt-1">
                When recruiters and hiring managers approve and extend an offer, it will appear here for your review and formal response.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {offers.map((offer) => {
                const isExtended = offer.status === "Extended";
                const isAccepted = offer.status === "Accepted";
                const isDeclined = offer.status === "Declined";
                const isResponding = respondingOfferId === offer.id;

                return (
                  <div
                    key={offer.id}
                    className="p-6 rounded-2xl border border-slate-200/90 bg-white shadow-sm space-y-5 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                              isExtended
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : isAccepted
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : isDeclined
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {offer.status}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            {offer.employmentType} • {offer.location}
                          </span>
                        </div>
                        <h4 className="text-xl font-bold text-slate-900 mt-1">{offer.title}</h4>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-black text-slate-900">
                          {offer.currency === "INR"
                            ? `₹${offer.salary.toLocaleString("en-IN")}`
                            : `${offer.currency} ${offer.salary.toLocaleString()}`}
                        </div>
                        <div className="text-xs text-slate-500 font-medium">Annual Compensation</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-slate-400 block font-semibold uppercase text-[10px]">
                          Proposed Start Date
                        </span>
                        <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                          {offer.startDate
                            ? new Date(offer.startDate).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "Flexible / To Be Confirmed"}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-slate-400 block font-semibold uppercase text-[10px]">
                          Offer Expiry
                        </span>
                        <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                          {offer.expiryDate
                            ? new Date(offer.expiryDate).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "Standard 7-Day Window"}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-slate-400 block font-semibold uppercase text-[10px]">
                          Extended On
                        </span>
                        <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                          {offer.createdAt
                            ? new Date(offer.createdAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "Recently"}
                        </span>
                      </div>
                    </div>

                    {offer.notes && (
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                          Recruitment Team Notes & Terms:
                        </span>
                        <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                          {offer.notes}
                        </p>
                      </div>
                    )}

                    {isExtended && (
                      <div className="pt-2 border-t border-slate-100 space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Optional Candidate Response Notes / Feedback:
                          </label>
                          <input
                            type="text"
                            placeholder="Add any message or question for the hiring team..."
                            value={candidateOfferNotes[offer.id] || ""}
                            onChange={(e) =>
                              setCandidateOfferNotes({
                                ...candidateOfferNotes,
                                [offer.id]: e.target.value,
                              })
                            }
                            className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => handleRespondToOffer(offer.id, "Declined")}
                            disabled={isResponding || actionLoading}
                            className="px-4 py-2 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                          >
                            Decline Offer
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRespondToOffer(offer.id, "Accepted")}
                            disabled={isResponding || actionLoading}
                            className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>{isResponding ? "Accepting..." : "Accept Offer"}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {isAccepted && (
                      <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>
                            <strong>Offer Formally Accepted!</strong> You have joined the team. Your recruitment pipeline has transitioned to <strong>Hired</strong>.
                          </span>
                        </div>
                        {offer.respondedAt && (
                          <span className="text-[11px] text-emerald-700 font-medium">
                            {new Date(offer.respondedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    )}

                    {isDeclined && (
                      <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>You have declined this job offer.</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Pre-Application Confirmation Modal with Immutable ATS Snapshot */}
      {isApplyModalOpen && (() => {
        const targetJob = jobs.find((j) => j.id === selectedJobId);
        const targetResume = resumes.find((r) => r.id === selectedResumeId);

        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="apply-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          >
            <div className="glass-card bg-white/95 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-purple-100/80 space-y-6 animate-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold border border-purple-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                    Application Snapshot Confirmation
                  </div>
                  <h3 id="apply-modal-title" className="text-xl font-bold text-slate-900">
                    Apply for {targetJob?.title || "Role"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {targetJob?.department} • {targetJob?.location || "Remote"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Assessment Snapshot Preview */}
              <div className="p-4 rounded-2xl border border-purple-100/80 bg-purple-50/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-slate-500">Selected Resume</span>
                  <span className="text-xs font-bold text-slate-800">
                    {targetResume?.originalFilename || "Selected Resume"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-slate-500">ATS Snapshot Score</span>
                  <span className="text-base font-black text-purple-600">
                    {currentAnalysis?.overallScore !== undefined
                      ? `${currentAnalysis.overallScore}%`
                      : "Pending Analysis"}
                  </span>
                </div>
                {currentAnalysis && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-purple-100 text-[11px] text-slate-600">
                    <div>Skills Match: <strong>{currentAnalysis.breakdown.skillsScore}%</strong></div>
                    <div>Experience: <strong>{currentAnalysis.breakdown.experienceScore}%</strong></div>
                    <div>Education: <strong>{currentAnalysis.breakdown.educationScore}%</strong></div>
                    <div>Role Relevance: <strong>{currentAnalysis.breakdown.roleRelevanceScore}%</strong></div>
                  </div>
                )}
                <div className="text-[11px] text-slate-400 pt-1">
                  Rubric: {currentAnalysis?.rubricVersion || "v2.0-deterministic-hybrid"} • Provider: {currentAnalysis?.provider ? (currentAnalysis.provider === "groq" ? "Groq Cloud AI" : currentAnalysis.provider === "gemini" ? "Google Gemini" : currentAnalysis.provider === "deterministic_engine" ? "Deterministic Rule Engine" : currentAnalysis.provider) : "Groq / Gemini AI"}
                </div>
              </div>

              {/* Immutable Snapshot Notice */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  Immutable Snapshot Guarantee
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  This ATS score and resume version will be permanently captured for your application. If you update your profile resume later, this application snapshot will remain unchanged.
                </p>
              </div>

              {/* Optional Cover Note */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase text-slate-600">
                  Notes for the Hiring Team (Optional)
                </label>
                <textarea
                  rows={3}
                  value={applicationNotes}
                  onChange={(e) => setApplicationNotes(e.target.value)}
                  placeholder="Share any additional context or highlights for this application..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  disabled={applyLoading}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitApplication}
                  disabled={applyLoading}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-500 hover:opacity-95 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {applyLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Submitting Application...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Confirm & Apply</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
