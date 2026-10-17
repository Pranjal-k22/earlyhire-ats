import React, { useEffect, useState } from "react";
import { X, Clock, ArrowRight, Loader2, User } from "lucide-react";
import { Application, InterviewStageHistoryItem } from "../../types/application";
import { fetchApplicationHistory } from "../../api/applicationApi";
import { StageBadge } from "./StageBadge";

interface ApplicationHistoryModalProps {
  application: Application | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ApplicationHistoryModal: React.FC<ApplicationHistoryModalProps> = ({
  application,
  isOpen,
  onClose,
}) => {
  const [history, setHistory] = useState<InterviewStageHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && application) {
      setLoading(true);
      setError(null);
      fetchApplicationHistory(application.id)
        .then((res) => {
          setHistory(res.data.history);
          setLoading(false);
        })
        .catch((err) => {
          setError(err?.message || "Failed to load stage history");
          setLoading(false);
        });
    }
  }, [isOpen, application]);

  if (!isOpen || !application) return null;

  const candidateName =
    application.candidateId?.fullName ||
    application.candidateId?.name ||
    "Candidate";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-600" />
            <div>
              <h2 id="history-dialog-title" className="text-base font-semibold text-slate-900">
                Stage Transition History
              </h2>
              <p className="text-xs text-slate-500">
                {candidateName} • {application.jobId?.title || "Job"}
              </p>
            </div>
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

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-2" />
              <p className="text-sm">Loading audit timeline...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">
              {error}
            </div>
          )}

          {!loading && !error && history.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">
              No stage history recorded yet.
            </p>
          )}

          {!loading && !error && history.length > 0 && (
            <div className="relative border-l-2 border-slate-200 ml-3 space-y-6">
              {history.map((event, idx) => (
                <div key={event.id || idx} className="relative pl-6">
                  {/* Timeline dot */}
                  <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-brand-500 flex items-center justify-center" />

                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {event.fromStage ? (
                        <>
                          <StageBadge stage={event.fromStage} size="sm" />
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <StageBadge stage={event.toStage} size="sm" />
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-medium">Initial:</span>
                          <StageBadge stage={event.toStage} size="sm" />
                        </div>
                      )}
                    </div>

                    {event.reason && (
                      <p className="text-xs text-slate-700 bg-white p-2 rounded-md border border-slate-200/60 italic">
                        "{event.reason}"
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/60">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {typeof event.actorId === "object" ? event.actorId.name : "System"}
                      </span>
                      <span>
                        {new Date(event.changedAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
