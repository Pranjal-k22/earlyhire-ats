import React from "react";
import {
  X,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  FileText,
  Calendar,
  Archive,
  ExternalLink,
  Award,
  Download,
} from "lucide-react";
import { Candidate } from "../../types/candidate";
import { CandidateSourceBadge } from "./CandidateSourceBadge";
import { CandidateNotesSection } from "./CandidateNotesSection";

interface Props {
  candidate: Candidate | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (candidate: Candidate) => void;
  onArchive: (candidate: Candidate) => Promise<void>;
}

export const CandidateDetailModal: React.FC<Props> = ({
  candidate,
  isOpen,
  onClose,
  onArchive,
}) => {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !candidate) return null;

  const displayName = candidate.fullName || candidate.name;
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isArchived = Boolean(candidate.archivedAt);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="candidate-detail-title"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200 cursor-default"
      >
        {/* Header Banner */}
        <div className="px-6 py-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-brand-50/30 flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Initials Avatar */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
              {initials}
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h3 id="candidate-detail-title" className="text-xl font-bold text-slate-900 tracking-tight">
                  {displayName}
                </h3>
                <CandidateSourceBadge source={candidate.source} size="sm" />
                {isArchived && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                    Archived
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                {candidate.currentTitle || "Candidate in Talent Pool"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white/80 transition-all"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Quick Contact & Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[11px] text-slate-400 block font-medium">Email Address</span>
                <a
                  href={`mailto:${candidate.email}`}
                  className="font-semibold text-slate-800 hover:text-brand-600 truncate block transition-colors"
                >
                  {candidate.email}
                </a>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[11px] text-slate-400 block font-medium">Contact Phone</span>
                <span className="font-semibold text-slate-800 block truncate">
                  {candidate.phone || "Not specified"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[11px] text-slate-400 block font-medium">Location</span>
                <span className="font-semibold text-slate-800 block truncate">
                  {candidate.location || "Remote"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <Award className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[11px] text-slate-400 block font-medium">Experience</span>
                <span className="font-semibold text-slate-800 block truncate">
                  {candidate.experienceYears} {candidate.experienceYears === 1 ? "Year" : "Years"}
                </span>
              </div>
            </div>
          </div>

          {/* Resume Link CTA */}
          {candidate.resumeUrl ? (
            <div className="p-3.5 rounded-xl bg-brand-50/50 border border-brand-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-brand-900">
                <FileText className="w-4 h-4 text-brand-600 shrink-0" />
                <span className="font-semibold">Candidate Resume Document (PDF)</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={candidate.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                  title="View PDF resume in a new tab"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Open Resume</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>
                <a
                  href={candidate.resumeUrl.replace(/[?&]inline=true/g, "")}
                  download
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                  title="Download candidate resume in PDF format"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-400 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>No resume link attached for this profile.</span>
            </div>
          )}

          {/* Skills Section */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
              Skills & Proficiencies
            </h4>
            {candidate.skills && candidate.skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {candidate.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 text-xs bg-slate-100 text-slate-700 font-medium rounded-lg border border-slate-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No skills specified.</p>
            )}
          </div>

          {/* Profile Summary */}
          {candidate.summary && (
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Candidate Summary & Notes
              </h4>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                {candidate.summary}
              </div>
            </div>
          )}

          {/* Recruiter Notes Section */}
          <CandidateNotesSection candidateId={candidate.id} />

          {/* Metadata Footer */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Registered on {new Date(candidate.createdAt).toLocaleDateString()}</span>
            </span>
            {candidate.createdBy && (
              <span className="flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                <span>Added by {candidate.createdBy.name}</span>
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <div>
            {!isArchived && (
              <button
                type="button"
                onClick={() => onArchive(candidate)}
                className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all flex items-center gap-1.5"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Archive Candidate</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
