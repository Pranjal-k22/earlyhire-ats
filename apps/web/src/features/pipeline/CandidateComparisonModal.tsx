import React, { useState, useEffect } from "react";
import {
  X,
  Award,
  Sparkles,
  AlertTriangle,
  UserCheck,
  Send,
  FileText,
  Clock,
} from "lucide-react";
import { fetchApplicationComparison } from "../../api/applicationApi";
import { CandidateComparison } from "../../types/application";

interface CandidateComparisonModalProps {
  applicationId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenOffer?: (applicationId: string) => void;
}

export const CandidateComparisonModal: React.FC<CandidateComparisonModalProps> = ({
  applicationId,
  isOpen,
  onClose,
  onOpenOffer,
}) => {
  const [data, setData] = useState<CandidateComparison | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !applicationId) {
      setData(null);
      setError(null);
      return;
    }

    const loadComparison = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchApplicationComparison(applicationId);
        setData(res.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load candidate comparison");
      } finally {
        setLoading(false);
      }
    };

    loadComparison();
  }, [isOpen, applicationId]);

  if (!isOpen) return null;

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-slate-400 bg-slate-100 border-slate-200";
    if (score >= 80) return "text-emerald-700 bg-emerald-50 border-emerald-200";
    if (score >= 65) return "text-sky-700 bg-sky-50 border-sky-200";
    if (score >= 50) return "text-amber-700 bg-amber-50 border-amber-200";
    return "text-rose-700 bg-rose-50 border-rose-200";
  };

  const getScoreLabel = (score: number | null) => {
    if (score === null) return "Incomplete Evaluation";
    if (score >= 80) return "Strong Match (80–100)";
    if (score >= 65) return "Potential Match (65–79)";
    if (score >= 50) return "Needs Review (50–64)";
    return "Low Evidence of Match (<50)";
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="comparison-modal-title"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 id="comparison-modal-title" className="text-base font-bold text-slate-900">
                Final Candidate Comparison & Decision Rubric
              </h2>
              <p className="text-xs text-slate-500">
                Weighted Decision Support Score: 40% Resume ATS + 60% Interview Performance
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-600">
                Calculating decision rubric and evidence breakdown...
              </p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-xs">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <p className="font-semibold">{error}</p>
            </div>
          ) : data ? (
            <>
              {/* Candidate & Job Summary Header */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>{data.candidate.name}</span>
                    <span className="text-xs font-normal text-slate-500">({data.candidate.email})</span>
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Applying for: <strong className="text-slate-800">{data.job.title}</strong>
                    {data.job.department && ` • ${data.job.department}`}
                    {data.candidate.experienceYears !== undefined && ` • ${data.candidate.experienceYears}y exp`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-white border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl shadow-2xs">
                    Stage: <strong className="text-indigo-600">{data.currentStage}</strong>
                  </span>
                </div>
              </div>

              {/* Composite Decision Score Banner */}
              <div className="p-5 rounded-3xl bg-linear-to-br from-indigo-50/70 via-white to-blue-50/50 border border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-xs">
                <div className="space-y-1.5 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                      Composite Decision Score
                    </span>
                  </div>
                  <h4 className="text-lg font-extrabold text-slate-900">
                    {getScoreLabel(data.scoring.compositeScore)}
                  </h4>
                  <p className="text-xs text-slate-600 max-w-lg">
                    Formula: {data.scoring.formula}
                  </p>
                  {!data.scoring.isComplete && (
                    <div className="flex items-center gap-1.5 text-amber-700 text-xs font-semibold pt-1">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>
                        {data.scoring.evaluationStatus === "pending_interview_evaluation"
                          ? "Awaiting interviewer evaluation submission to finalize composite score."
                          : "Awaiting ATS resume screening evaluation."}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center">
                  <div
                    className={`w-20 h-20 rounded-full border-4 flex flex-col items-center justify-center shadow-sm ${getScoreColor(
                      data.scoring.compositeScore
                    )}`}
                  >
                    <span className="text-2xl font-black">
                      {data.scoring.compositeScore !== null ? data.scoring.compositeScore : "—"}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-tight">/ 100</span>
                  </div>
                </div>
              </div>

              {/* Breakdown Grid: Left = ATS Resume (40%), Right = Interview Evaluation (60%) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Left: Resume ATS Assessment (40%) */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-sky-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Resume ATS Evaluation (40%)
                      </h4>
                    </div>
                    <span
                      className={`text-xs font-extrabold px-2.5 py-1 rounded-xl border ${getScoreColor(
                        data.atsEvaluation.score
                      )}`}
                    >
                      {data.atsEvaluation.score !== null ? `${data.atsEvaluation.score} / 100` : "No ATS Score"}
                    </span>
                  </div>

                  {data.atsEvaluation.breakdown && (
                    <div className="space-y-2 text-xs">
                      {Object.entries(data.atsEvaluation.breakdown).map(([key, val]) => (
                        <div key={key} className="space-y-1">
                          <div className="flex justify-between text-slate-600 font-medium capitalize">
                            <span>{key.replace(/([A-Z])/g, " $1")}</span>
                            <span className="font-bold text-slate-800">{Number(val)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-sky-500 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(0, Number(val)))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Skills matched */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">Matched Job Skills</span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {data.atsEvaluation.matchedSkills.length} verified
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {data.atsEvaluation.matchedSkills.length > 0 ? (
                        data.atsEvaluation.matchedSkills.map((sk) => (
                          <span
                            key={sk}
                            className="px-2 py-0.5 bg-emerald-50 border border-emerald-200/80 text-emerald-800 font-medium text-[11px] rounded-lg"
                          >
                            ✓ {sk}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 text-xs italic">No matched skills recorded</span>
                      )}
                    </div>
                  </div>

                  {/* Missing criteria */}
                  {data.atsEvaluation.missingCriteria.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-amber-800">Missing / Unverified Skills</span>
                        <span className="text-amber-600 font-mono text-[11px]">
                          {data.atsEvaluation.missingCriteria.length} items
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {data.atsEvaluation.missingCriteria.map((mc) => (
                          <span
                            key={mc}
                            className="px-2 py-0.5 bg-amber-50 border border-amber-200/80 text-amber-800 font-medium text-[11px] rounded-lg"
                          >
                            ⚠️ {mc}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Interviewer Performance & Feedbacks (60%) */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-indigo-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Interview Scorecard (60%)
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-extrabold px-2.5 py-1 rounded-xl border ${getScoreColor(
                          data.interviewEvaluation.normalizedScore
                        )}`}
                      >
                        {data.interviewEvaluation.normalizedScore !== null
                          ? `${data.interviewEvaluation.normalizedScore} / 100`
                          : "Pending Feedback"}
                      </span>
                      {data.interviewEvaluation.rawAverageRating !== null && (
                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-xl">
                          ★ {data.interviewEvaluation.rawAverageRating} / 5
                        </span>
                      )}
                    </div>
                  </div>

                  {data.interviewEvaluation.feedbacks.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs space-y-1">
                      <Clock className="w-6 h-6 text-slate-300 mx-auto" />
                      <p className="font-semibold text-slate-600">No Interview Evaluations Submitted</p>
                      <p className="text-[11px]">
                        Assigned interviewers must submit their evaluation scorecard to record interview scores.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                      {data.interviewEvaluation.feedbacks.map((fb) => (
                        <div
                          key={fb.id}
                          className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">{fb.interviewerName}</span>
                            <span
                              className={`px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-md tracking-wider ${
                                fb.recommendation === "strong_hire"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : fb.recommendation === "hire"
                                  ? "bg-sky-100 text-sky-800"
                                  : fb.recommendation === "hold"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {fb.recommendation.replace("_", " ")}
                            </span>
                          </div>

                          {/* Sub-ratings */}
                          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200/60">
                            <div>
                              Technical: <strong>{fb.ratings.technicalRating}/5</strong>
                            </div>
                            <div>
                              Communication: <strong>{fb.ratings.communicationRating}/5</strong>
                            </div>
                            <div>
                              Problem Solving: <strong>{fb.ratings.problemSolvingRating}/5</strong>
                            </div>
                            <div>
                              Culture & Values: <strong>{fb.ratings.cultureAndValuesRating}/5</strong>
                            </div>
                          </div>

                          {fb.strengths && (
                            <div className="text-[11px] text-slate-700">
                              <strong className="text-emerald-700">Strengths:</strong> {fb.strengths}
                            </div>
                          )}

                          {fb.concerns && (
                            <div className="text-[11px] text-slate-700">
                              <strong className="text-amber-700">Concerns:</strong> {fb.concerns}
                            </div>
                          )}

                          {fb.internalNotes && (
                            <div className="text-[11px] text-slate-500 italic bg-slate-100/70 p-2 rounded border border-slate-200/50">
                              <strong>Confidential Note:</strong> {fb.internalNotes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>

          {data && onOpenOffer && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenOffer(data.applicationId);
              }}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Manage / Extend Offer</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
