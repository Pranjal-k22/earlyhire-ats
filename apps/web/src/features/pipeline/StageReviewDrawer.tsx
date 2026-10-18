import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  Award,
  RefreshCw,
  Calendar,
  MessageSquare,
} from "lucide-react";
import {
  fetchOrGenerateStageReview,
  recordHumanDecision,
  StageReview,
} from "../../api/stageReviewApi";
import { Application } from "../../types/application";

interface StageReviewDrawerProps {
  application: Application | null;
  isOpen: boolean;
  onClose: () => void;
  onScheduleInterview: (app: Application) => void;
  onSubmitFeedback: (app: Application) => void;
  onRefreshApplication?: () => void;
}

export const StageReviewDrawer: React.FC<StageReviewDrawerProps> = ({
  application,
  isOpen,
  onClose,
  onScheduleInterview,
  onSubmitFeedback,
  onRefreshApplication,
}) => {
  const [review, setReview] = useState<StageReview | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [decisionNotes, setDecisionNotes] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && application && (application.currentStage === "Screening" || application.currentStage === "Interview")) {
      setLoading(true);
      setReview(null);
      setMessage(null);
      fetchOrGenerateStageReview(application.id)
        .then((res) => {
          setReview(res.data.review);
        })
        .catch((err) => {
          setMessage(err instanceof Error ? err.message : "Failed to load stage review");
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

  const handleDecision = async (decision: "advance" | "hold" | "reject") => {
    if (!review) return;
    try {
      setActionLoading(true);
      const res = await recordHumanDecision(review.id, decision, decisionNotes);
      setReview(res.data.review);
      setDecisionNotes("");
      setMessage(`Human decision "${decision.toUpperCase()}" recorded successfully.`);
      if (onRefreshApplication) onRefreshApplication();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to record decision");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="stage-review-drawer-title"
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
              <h3 id="stage-review-drawer-title" className="text-base font-bold text-white">
                {application.candidateId?.name} — {application.currentStage} Review
              </h3>
              <p className="text-xs text-slate-300">
                {application.jobId?.title} • AI Decision Support & Evaluation Rubric
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {message && (
            <div className="p-3 bg-brand-50 border border-brand-200 text-brand-900 rounded-xl text-xs font-medium">
              {message}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-brand-600" />
              <p className="text-sm font-medium">Synthesizing Stage Guidance & Rubric...</p>
            </div>
          ) : review ? (
            <div className="space-y-6">
              {/* Executive Summary Card */}
              <div className="p-5 bg-gradient-to-br from-indigo-50 to-slate-50 rounded-2xl border border-indigo-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    AI Stage Assessment
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Suggestion: {review.recommendedDecision.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{review.aiSummary}</p>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => onScheduleInterview(application)}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-all"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Schedule Google Meet</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSubmitFeedback(application)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Submit Interview Feedback</span>
                </button>
              </div>

              {/* Strengths & Risks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Key Observed Strengths
                  </h4>
                  <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
                    {review.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Areas to Probe
                  </h4>
                  <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
                    {review.gapsOrRisks.map((g, i) => (
                      <li key={i}>{g}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Targeted Questions & Rubric */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-brand-600" />
                  Suggested Targeted Questions & Rubric Criteria
                </h4>
                <div className="space-y-3">
                  {review.suggestedQuestions.map((q, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5 shadow-2xs">
                      <div className="text-xs font-semibold text-brand-600 uppercase tracking-wider">
                        {q.purpose || `Question ${idx + 1}`}
                      </div>
                      <div className="text-sm font-semibold text-slate-900">{q.question}</div>
                      {q.expectedSignal && (
                        <div className="text-xs text-slate-500 pt-1">
                          <span className="font-semibold text-slate-700">Expected Signal: </span>
                          {q.expectedSignal}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Human Decision Section */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Award className="w-4 h-4 text-brand-600" />
                  Independent Human Decision
                </h4>

                {review.humanDecision ? (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">
                        Decision: {review.humanDecision.decision.toUpperCase()}
                      </span>
                      <span className="text-slate-400">
                        {new Date(review.humanDecision.decidedAt).toLocaleString()}
                      </span>
                    </div>
                    <div>By: {review.humanDecision.actorName}</div>
                    {review.humanDecision.notes && (
                      <p className="italic text-slate-600 pt-1">"{review.humanDecision.notes}"</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      rows={2}
                      placeholder="Add evaluation rationale or decision notes..."
                      value={decisionNotes}
                      onChange={(e) => setDecisionNotes(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleDecision("advance")}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                      >
                        Advance Candidate
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleDecision("hold")}
                        className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                      >
                        Hold
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleDecision("reject")}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-sm">
              Stage reviews are generated when candidates are in Screening or Interview.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
