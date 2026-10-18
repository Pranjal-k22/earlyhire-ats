import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  CheckCircle,
  AlertCircle,
  FileText,
  Clock,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { fetchApplicationAtsReport, AtsReport } from "../../api/atsApi";
import { Application, IAtsSnapshot } from "../../types/application";

interface AtsReportDrawerProps {
  application: Application | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AtsReportDrawer: React.FC<AtsReportDrawerProps> = ({
  application,
  isOpen,
  onClose,
}) => {
  const [report, setReport] = useState<AtsReport | null>(null);
  const [snapshot, setSnapshot] = useState<IAtsSnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && application) {
      setLoading(true);
      setErrorMessage(null);
      setSnapshot(application.atsSnapshot || null);

      fetchApplicationAtsReport(application.id)
        .then((res) => {
          if (res.data.snapshot) {
            setSnapshot(res.data.snapshot);
          }
          if (res.data.report) {
            setReport(res.data.report);
          }
        })
        .catch((err) => {
          setErrorMessage(err instanceof Error ? err.message : "Failed to load application ATS report");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, application]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !application) return null;

  const candidateName = application.candidateId?.fullName || application.candidateId?.name || "Candidate";
  const jobTitle = application.jobId?.title || "Job Opening";
  const overallScore = snapshot?.overallScore ?? 0;
  const isHighMatch = overallScore >= 70;

  const resumeFilename =
    (typeof report?.resumeId === "object" && report.resumeId?.originalFilename) ||
    (typeof application.resumeId === "object" && application.resumeId?.originalFilename) ||
    "Submitted Resume";

  const resumeId =
    (typeof report?.resumeId === "object" && (report.resumeId?.id || (report.resumeId as { _id?: string })?._id)) ||
    (typeof application.resumeId === "object" && (application.resumeId?.id || (application.resumeId as { _id?: string })?._id)) ||
    (typeof application.resumeId === "string" ? application.resumeId : null);
  const resumeUrl = resumeId
    ? `/api/v1/resumes/${resumeId}/download?inline=true`
    : application.candidateId?.resumeUrl || null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ats-report-drawer-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs transition-opacity cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-slide-left cursor-default"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-300 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h3 id="ats-report-drawer-title" className="text-base font-bold text-white">
                {candidateName} — Application ATS Assessment
              </h3>
              <p className="text-xs text-slate-300">
                {jobTitle} • Submitted Resume Compatibility Snapshot
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {resumeUrl && (
              <a
                href={resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-slate-700 transition-colors"
                title="Open candidate's submitted PDF resume in a new tab"
              >
                <FileText className="w-3.5 h-3.5 text-brand-400" />
                <span>Resume (PDF)</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {loading && !snapshot ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-brand-600" />
              <p className="text-sm font-medium">Loading Immutable ATS Assessment Snapshot...</p>
            </div>
          ) : snapshot ? (
            <div className="space-y-6">
              {/* Overall Score Card */}
              <div className="p-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Immutable Submission Snapshot
                  </div>
                  <h3 className="text-xl font-bold text-white">ATS Compatibility Score</h3>
                  <p className="text-slate-300 text-xs max-w-md">
                    Captured at application time. This snapshot remains immutable to protect candidate submission history.
                  </p>
                  <div className="text-xs text-slate-400 pt-1 flex flex-wrap gap-2">
                    <span>Provider: {snapshot.provider} ({snapshot.model})</span>
                    <span>•</span>
                    <span>Rubric: {snapshot.rubricVersion}</span>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10 shrink-0 min-w-[140px]">
                  {snapshot.status === "pending" || snapshot.status === "in_progress" ? (
                    <>
                      <div className="text-2xl sm:text-3xl font-black text-slate-300">
                        Pending
                      </div>
                      <div className="text-xs uppercase font-semibold text-slate-400 mt-1">
                        In Progress
                      </div>
                    </>
                  ) : snapshot.status === "failed" ? (
                    <>
                      <div className="text-xl sm:text-2xl font-black text-amber-400">
                        Unavailable
                      </div>
                      <div className="text-xs uppercase font-semibold text-slate-400 mt-1">
                        Offline Fallback
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        className={`text-4xl sm:text-5xl font-black ${
                          isHighMatch ? "text-emerald-400" : "text-amber-400"
                        }`}
                      >
                        {overallScore}/100
                      </div>
                      <div className="text-xs uppercase font-semibold text-slate-300 mt-1">
                        {isHighMatch ? "Strong Alignment" : "Coaching Review"}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Subsequent Assessment Difference Notice if Candidate rechecked later */}
              {report && report.overallScore !== snapshot.overallScore && (
                <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/70 text-xs text-indigo-900 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Later Candidate Assessment Recorded:</span>
                    <span>
                      A subsequent check was performed after application (Score: {report.overallScore}/100). The application record remains bound to this submitted snapshot ({snapshot.overallScore}/100).
                    </span>
                  </div>
                </div>
              )}

              {/* Resume Quality & Parseability Warning if low confidence */}
              {report?.confidence === "low" && (
                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Resume Parseability Notice:</span>
                    <span>
                      Text extraction detected limited section structure. Column layouts or styling in the original file may affect automated matching.
                    </span>
                  </div>
                </div>
              )}

              {/* Submission Provenance Metadata */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600">
                <div>
                  <span className="text-slate-400 block font-medium">Submitted Resume</span>
                  {resumeUrl ? (
                    <a
                      href={resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 mt-0.5 truncate group/link hover:underline"
                      title={`Open ${resumeFilename} (PDF)`}
                    >
                      <FileText className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                      <span className="truncate">{resumeFilename}</span>
                      <ExternalLink className="w-3 h-3 shrink-0 text-brand-500 opacity-70 group-hover/link:opacity-100" />
                    </a>
                  ) : (
                    <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5 truncate" title={resumeFilename}>
                      <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{resumeFilename}</span>
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400">Version {snapshot.resumeVersion || 1}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Assessment Status</span>
                  <span className="font-semibold text-slate-800 uppercase mt-0.5 block">
                    {snapshot.status}
                  </span>
                  {snapshot.resumeContentHash && (
                    <span className="text-[10px] text-slate-400 font-mono truncate block" title={snapshot.resumeContentHash}>
                      SHA: {snapshot.resumeContentHash.slice(0, 8)}...
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">AI Model Provenance</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block truncate">
                    {snapshot.provider}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {snapshot.model}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Assessed At</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    {snapshot.assessedAt ? new Date(snapshot.assessedAt).toLocaleDateString() : "At Submission"}
                  </span>
                  <span className="text-[10px] text-slate-400">Snapshot time</span>
                </div>
              </div>

              {/* Rubric Breakdown Grid */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Rubric Component Scores
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Skills (40%)", score: snapshot.breakdown?.skillsScore ?? 0 },
                    { label: "Experience (30%)", score: snapshot.breakdown?.experienceScore ?? 0 },
                    { label: "Education (15%)", score: snapshot.breakdown?.educationScore ?? 0 },
                    { label: "Role Relevance (15%)", score: snapshot.breakdown?.roleRelevanceScore ?? 0 },
                  ].map((item) => (
                    <div key={item.label} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="text-[11px] text-slate-500 font-medium">{item.label}</div>
                      <div className="text-xl font-bold text-slate-800 mt-1">{item.score}/100</div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="bg-brand-600 h-full rounded-full transition-all"
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Matched Criteria */}
              {snapshot.matchedSkills && snapshot.matchedSkills.length > 0 && (
                <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-3">
                  <h4 className="font-bold text-emerald-900 text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Evidenced Required Skills ({snapshot.matchedSkills.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {snapshot.matchedSkills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Supporting Resume Evidence & Achievements */}
              {report?.experienceEvidence && report.experienceEvidence.length > 0 && (
                <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-xs">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Supporting Resume Evidence & Achievements
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {report.experienceEvidence.map((ev, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span>{ev}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Missing or Unverified Criteria */}
              {snapshot.missingCriteria && snapshot.missingCriteria.length > 0 && (
                <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/50 space-y-3">
                  <h4 className="font-bold text-amber-900 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    Criteria Not Evidenced in Submitted Resume ({snapshot.missingCriteria.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {snapshot.missingCriteria.map((gap) => (
                      <span
                        key={gap}
                        className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200"
                      >
                        {gap}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Detailed Recommendations if available */}
              {report?.concreteSuggestions && report.concreteSuggestions.length > 0 && (
                <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-xs">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    AI-Assisted Candidate Coaching & Suggestions
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-700">
                    {report.concreteSuggestions.map((suggestion, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Human Decision Authority Notice */}
              <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <span className="font-bold text-slate-800 block flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-brand-600" />
                  Human Hiring Team Responsibility
                </span>
                <p>
                  EarlyAI ATS scores provide evidence-grounded decision support. Candidate qualification, stage advancement, and hiring decisions remain the exclusive responsibility of authorized human reviewers.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 border rounded-2xl border-slate-200 text-slate-400 space-y-2">
              <AlertCircle className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-medium">No ATS assessment snapshot recorded for this application.</p>
              <p className="text-xs text-slate-400">
                Applications submitted prior to snapshot integration can be evaluated on-demand by the hiring team.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
