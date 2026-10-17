import React, { useState, useEffect } from "react";
import { X, MessageSquare, Shield, AlertCircle } from "lucide-react";
import {
  submitFeedback,
  fetchFeedbackForApplication,
  releaseFeedback,
  FeedbackItem,
} from "../../api/feedbackApi";
import { fetchInterviewsForApplication, InterviewItem } from "../../api/interviewApi";
import { Application } from "../../types/application";

interface InterviewFeedbackModalProps {
  application: Application | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const InterviewFeedbackModal: React.FC<InterviewFeedbackModalProps> = ({
  application,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [interviews, setInterviews] = useState<InterviewItem[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [selectedInterviewId, setSelectedInterviewId] = useState<string>("");
  const [technicalRating, setTechnicalRating] = useState(4);
  const [communicationRating, setCommunicationRating] = useState(4);
  const [problemSolvingRating, setProblemSolvingRating] = useState(4);
  const [cultureRating, setCultureRating] = useState(4);
  const [overallRating, setOverallRating] = useState(4);
  const [strengths, setStrengths] = useState("");
  const [concerns, setConcerns] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [candidateReleasableFeedback, setCandidateReleasableFeedback] = useState("");
  const [recommendation, setRecommendation] = useState<"strong_hire" | "hire" | "hold" | "no_hire">("hire");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && application) {
      setLoading(true);
      Promise.all([
        fetchInterviewsForApplication(application.id).catch(() => ({ success: true, data: { interviews: [] } })),
        fetchFeedbackForApplication(application.id).catch(() => ({ success: true, data: { feedbacks: [] } })),
      ])
        .then(([intRes, fbRes]) => {
          setInterviews(intRes.data.interviews || []);
          setFeedbacks(fbRes.data.feedbacks || []);
          if (intRes.data.interviews?.length > 0) {
            setSelectedInterviewId(intRes.data.interviews[0].id);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, application]);

  if (!isOpen || !application) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInterviewId) {
      setError("Please select an interview session.");
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      const res = await submitFeedback({
        interviewId: selectedInterviewId,
        applicationId: application.id,
        ratings: {
          technicalRating,
          communicationRating,
          problemSolvingRating,
          cultureAndValuesRating: cultureRating,
          overallRating,
        },
        strengths,
        concerns,
        internalNotes,
        candidateReleasableFeedback,
        recommendation,
      });

      setFeedbacks([res.data.feedback, ...feedbacks]);
      setStrengths("");
      setConcerns("");
      setInternalNotes("");
      setCandidateReleasableFeedback("");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit feedback");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRelease = async (feedbackId: string) => {
    try {
      setActionLoading(true);
      const res = await releaseFeedback(feedbackId);
      setFeedbacks(feedbacks.map((f) => (f.id === feedbackId ? res.data.feedback : f)));
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to release feedback");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-200 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-300 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Structured Interview Evaluation</h3>
              <p className="text-xs text-slate-300">
                {application.candidateId?.name} — {application.jobId?.title}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="py-4 text-center text-xs text-slate-400 animate-pulse">
              Loading interview evaluations...
            </div>
          )}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Existing Submitted Feedbacks */}
          {feedbacks.length > 0 && (
            <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Submitted Evaluations ({feedbacks.length})
              </h4>
              <div className="space-y-3">
                {feedbacks.map((f) => (
                  <div key={f.id} className="p-4 bg-white rounded-xl border border-slate-200 text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900">
                        {f.interviewerName || "Interviewer"} • Recommendation: {f.recommendation?.toUpperCase()}
                      </span>
                      <span className="text-slate-400">{new Date(f.createdAt).toLocaleDateString()}</span>
                    </div>

                    {f.internalNotes && (
                      <div className="p-2 bg-amber-50 text-amber-900 rounded-lg border border-amber-200">
                        <span className="font-bold">Confidential Internal Notes: </span>
                        {f.internalNotes}
                      </div>
                    )}

                    {f.candidateReleasableFeedback && (
                      <div className="p-2 bg-slate-50 text-slate-700 rounded-lg border border-slate-100 flex justify-between items-center gap-2">
                        <div>
                          <span className="font-semibold">Candidate Feedback: </span>
                          {f.candidateReleasableFeedback}
                        </div>
                        {f.isReleasedToCandidate ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold shrink-0">
                            Released
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRelease(f.id)}
                            disabled={actionLoading}
                            className="px-3 py-1 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold shrink-0 transition-all"
                          >
                            Release to Candidate
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit New Evaluation Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Submit New Evaluation Rating
            </h4>

            {interviews.length > 0 ? (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Interview Session
                </label>
                <select
                  value={selectedInterviewId}
                  onChange={(e) => setSelectedInterviewId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                >
                  {interviews.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.title} ({new Date(i.scheduledStartTime).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 text-amber-800 rounded-xl text-xs">
                No interview sessions recorded. Schedule an interview first.
              </div>
            )}

            {/* Competency Ratings 1-5 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "Technical Competency", val: technicalRating, set: setTechnicalRating },
                { label: "Communication", val: communicationRating, set: setCommunicationRating },
                { label: "Problem Solving", val: problemSolvingRating, set: setProblemSolvingRating },
                { label: "Culture & Values", val: cultureRating, set: setCultureRating },
                { label: "Overall Score", val: overallRating, set: setOverallRating },
              ].map((item) => (
                <div key={item.label} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-xs font-medium text-slate-600 mb-1">{item.label}</div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => item.set(star)}
                        className={`p-1 rounded ${
                          star <= item.val ? "text-amber-500" : "text-slate-300 hover:text-slate-400"
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Candidate Releasable Feedback
              </label>
              <textarea
                rows={2}
                placeholder="Constructive feedback to share with candidate upon release..."
                value={candidateReleasableFeedback}
                onChange={(e) => setCandidateReleasableFeedback(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-amber-800 mb-1 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-600" />
                Confidential Recruiter & Hiring Team Notes (Never Shown to Candidate)
              </label>
              <textarea
                rows={2}
                placeholder="Internal evaluation notes, team deliberations, or compensation notes..."
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-amber-300 bg-amber-50/30 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>

            <div className="pt-2 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Recommendation:
                </label>
                <select
                  value={recommendation}
                  onChange={(e) => setRecommendation(e.target.value as typeof recommendation)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold"
                >
                  <option value="strong_hire">Strong Hire</option>
                  <option value="hire">Hire</option>
                  <option value="hold">Hold</option>
                  <option value="no_hire">No Hire</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={actionLoading || interviews.length === 0}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                {actionLoading ? "Submitting..." : "Submit Evaluation"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
