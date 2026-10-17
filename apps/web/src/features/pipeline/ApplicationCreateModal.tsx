import React, { useEffect, useState } from "react";
import { X, UserPlus, Loader2, AlertCircle } from "lucide-react";
import { fetchCandidates } from "../../api/candidateApi";
import { fetchJobs } from "../../api/jobApi";
import { createApplication } from "../../api/applicationApi";
import { Candidate } from "../../types/candidate";
import { Job } from "../../types/job";

interface ApplicationCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  initialJobId?: string;
}

export const ApplicationCreateModal: React.FC<ApplicationCreateModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  initialJobId,
}) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [selectedJobId, setSelectedJobId] = useState(initialJobId || "");
  const [source, setSource] = useState("Direct");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoadingData(true);
      setError(null);
      if (initialJobId) {
        setSelectedJobId(initialJobId);
      }

      Promise.all([
        fetchCandidates({ limit: 100 }),
        fetchJobs({ status: "Open", limit: 100 }),
      ])
        .then(([candRes, jobRes]) => {
          setCandidates(candRes.data || []);
          setJobs(jobRes.data || []);
          setLoadingData(false);
        })
        .catch((err) => {
          setError(err?.message || "Failed to load candidates and jobs");
          setLoadingData(false);
        });
    }
  }, [isOpen, initialJobId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidateId || !selectedJobId) {
      setError("Please select both a candidate and an open job");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await createApplication({
        candidateId: selectedCandidateId,
        jobId: selectedJobId,
        source: source.trim() || undefined,
      });
      setSelectedCandidateId("");
      setSelectedJobId("");
      setSource("Direct");
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create application");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-application-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-brand-600" />
            <h2 id="create-application-title" className="text-base font-semibold text-slate-900">
              New Job Application
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loadingData ? (
            <div className="py-8 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-brand-500 mb-2" />
              <p className="text-xs">Loading candidates and job openings...</p>
            </div>
          ) : (
            <>
              {/* Select Candidate */}
              <div>
                <label
                  htmlFor="app-candidate-select"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Select Candidate *
                </label>
                <select
                  id="app-candidate-select"
                  value={selectedCandidateId}
                  onChange={(e) => setSelectedCandidateId(e.target.value)}
                  required
                  className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                >
                  <option value="">-- Choose Candidate --</option>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName || c.name} ({c.email})
                      {c.currentTitle ? ` — ${c.currentTitle}` : ""}
                    </option>
                  ))}
                </select>
                {candidates.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    No candidates found. Please create a candidate profile first.
                  </p>
                )}
              </div>

              {/* Select Job Opening */}
              <div>
                <label
                  htmlFor="app-job-select"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Select Job Opening *
                </label>
                <select
                  id="app-job-select"
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  required
                  className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                >
                  <option value="">-- Choose Open Job --</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} ({j.department} • {j.location})
                    </option>
                  ))}
                </select>
                {jobs.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    No open jobs available. Please open a job position first.
                  </p>
                )}
              </div>

              {/* Application Source */}
              <div>
                <label
                  htmlFor="app-source"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Application Source
                </label>
                <input
                  id="app-source"
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g. LinkedIn, Referral, Career Portal"
                  className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-lg text-xs text-slate-500">
                Newly created applications start at the <span className="font-semibold text-slate-700">Applied</span> stage and can advance through the hiring pipeline.
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || loadingData || candidates.length === 0 || jobs.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Create Application</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
