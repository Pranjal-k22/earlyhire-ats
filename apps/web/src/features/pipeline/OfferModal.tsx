import React, { useState, useEffect } from "react";
import {
  X,
  FileCheck,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Check,
  Ban,
  Sparkles,
} from "lucide-react";
import {
  fetchOfferByApplicationId,
  createOffer,
  approveOffer,
  extendOffer,
} from "../../api/offerApi";
import { Offer, CreateOfferPayload, OfferStatus } from "../../types/offer";

interface OfferModalProps {
  applicationId: string | null;
  candidateName?: string;
  jobTitle?: string;
  isOpen: boolean;
  onClose: () => void;
  onOfferUpdated?: () => void;
}

export const OfferModal: React.FC<OfferModalProps> = ({
  applicationId,
  candidateName = "Candidate",
  jobTitle = "Role",
  isOpen,
  onClose,
  onOfferUpdated,
}) => {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Form states for creating a new offer
  const [formTitle, setFormTitle] = useState<string>(jobTitle);
  const [formSalary, setFormSalary] = useState<number>(1200000);
  const [formCurrency, setFormCurrency] = useState<string>("INR");
  const [formType, setFormType] = useState<"FullTime" | "PartTime" | "Contract" | "Internship">("FullTime");
  const [formLocation, setFormLocation] = useState<string>("Remote");
  const [formStartDate, setFormStartDate] = useState<string>("");
  const [formExpiryDate, setFormExpiryDate] = useState<string>("");
  const [formNotes, setFormNotes] = useState<string>("");

  useEffect(() => {
    if (!isOpen || !applicationId) {
      setOffer(null);
      setError(null);
      setSuccessNotice(null);
      return;
    }

    setFormTitle(jobTitle);
    const loadOffer = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchOfferByApplicationId(applicationId);
        setOffer(res.data.offer);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load offer data");
      } finally {
        setLoading(false);
      }
    };

    loadOffer();
  }, [isOpen, applicationId, jobTitle]);

  if (!isOpen) return null;

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicationId) return;

    setActionLoading(true);
    setError(null);
    setSuccessNotice(null);

    try {
      const payload: CreateOfferPayload = {
        applicationId,
        title: formTitle.trim() || jobTitle,
        salary: Number(formSalary),
        currency: formCurrency,
        employmentType: formType,
        location: formLocation.trim() || "Remote",
        startDate: formStartDate || undefined,
        expiryDate: formExpiryDate || undefined,
        notes: formNotes.trim() || undefined,
      };

      const res = await createOffer(payload);
      setOffer(res.data.offer);
      setSuccessNotice("Offer draft created successfully!");
      if (onOfferUpdated) onOfferUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create offer");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!offer) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await approveOffer(offer.id);
      setOffer(res.data.offer);
      setSuccessNotice("Offer approved successfully!");
      if (onOfferUpdated) onOfferUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve offer");
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtend = async () => {
    if (!offer) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await extendOffer(offer.id);
      setOffer(res.data.offer);
      setSuccessNotice("Offer extended to candidate! Application moved to 'Offer' stage.");
      if (onOfferUpdated) onOfferUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extend offer");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: OfferStatus) => {
    switch (status) {
      case "Draft":
        return <span className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-xl">Draft</span>;
      case "PendingApproval":
        return <span className="px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl">Pending Approval</span>;
      case "Approved":
        return <span className="px-2.5 py-1 text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 rounded-xl">Approved</span>;
      case "Extended":
        return <span className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl">Extended to Candidate</span>;
      case "Accepted":
        return <span className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl">Accepted 🎉</span>;
      case "Declined":
        return <span className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">Declined</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 rounded-xl">{status}</span>;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="offer-modal-title"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="offer-modal-title" className="text-base font-bold text-slate-900">
                Offer Management
              </h2>
              <p className="text-xs text-slate-500">
                {candidateName} • {jobTitle}
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
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500">Loading offer details...</p>
            </div>
          ) : offer ? (
            /* Existing Offer Display */
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{offer.title}</h3>
                  <p className="text-xs text-slate-500">
                    Created by {offer.createdBy.name} on {new Date(offer.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {getStatusBadge(offer.status)}
              </div>

              {/* Offer Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1">
                  <span className="text-slate-400 font-medium">Compensation</span>
                  <p className="text-base font-extrabold text-slate-900">
                    {offer.currency === "INR"
                      ? `₹${offer.salary.toLocaleString("en-IN")}`
                      : `${offer.currency} ${offer.salary.toLocaleString()}`}
                  </p>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1">
                  <span className="text-slate-400 font-medium">Type & Mode</span>
                  <p className="font-bold text-slate-800">
                    {offer.employmentType} • {offer.location}
                  </p>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1">
                  <span className="text-slate-400 font-medium">Start Date</span>
                  <p className="font-bold text-slate-800">
                    {offer.startDate ? new Date(offer.startDate).toLocaleDateString() : "To be decided"}
                  </p>
                </div>

                {offer.expiryDate && (
                  <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1">
                    <span className="text-slate-400 font-medium">Offer Expiry</span>
                    <p className="font-bold text-amber-700">
                      {new Date(offer.expiryDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {offer.notes && (
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-slate-700">Offer Terms & Notes:</span>
                  <p className="text-slate-600 whitespace-pre-wrap">{offer.notes}</p>
                </div>
              )}

              {/* Status Specific Banners */}
              {offer.status === "Extended" && (
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center gap-3 text-indigo-900 text-xs">
                  <Clock className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div>
                    <p className="font-bold">Offer Extended to Candidate</p>
                    <p className="text-indigo-700 text-[11px]">
                      The candidate can review and accept or decline this offer directly in their candidate portal.
                    </p>
                  </div>
                </div>
              )}

              {offer.status === "Accepted" && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Candidate Accepted the Offer 🎉</span>
                  </div>
                  {offer.candidateResponseNotes && (
                    <p className="text-emerald-900 bg-white/80 p-2.5 rounded-lg border border-emerald-200 text-[11px]">
                      <strong>Candidate Message:</strong> "{offer.candidateResponseNotes}"
                    </p>
                  )}
                  <p className="text-[11px] text-emerald-700">
                    Application hiring stage has been updated to <strong>Hired</strong>.
                  </p>
                </div>
              )}

              {offer.status === "Declined" && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-rose-800 font-bold">
                    <Ban className="w-5 h-5 text-rose-600" />
                    <span>Candidate Declined Offer</span>
                  </div>
                  {offer.candidateResponseNotes && (
                    <p className="text-rose-900 bg-white/80 p-2.5 rounded-lg border border-rose-200 text-[11px]">
                      <strong>Reason:</strong> "{offer.candidateResponseNotes}"
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Create Offer Form */
            <form onSubmit={handleCreateOffer} className="space-y-4">
              <div className="p-3 bg-blue-50/80 border border-blue-200/80 rounded-xl text-blue-800 text-xs">
                Draft a formal offer for <strong>{candidateName}</strong> for the position of <strong>{jobTitle}</strong>.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Offered Position Title
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Senior Software Engineer"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Annual Salary
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      step={1000}
                      value={formSalary}
                      onChange={(e) => setFormSalary(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Currency
                    </label>
                    <select
                      value={formCurrency}
                      onChange={(e) => setFormCurrency(e.target.value)}
                      className="w-full px-2 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold"
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="CAD">CAD ($)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Employment Type
                  </label>
                  <select
                    value={formType}
                    onChange={(e) =>
                      setFormType(e.target.value as "FullTime" | "PartTime" | "Contract" | "Internship")
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="FullTime">Full Time</option>
                    <option value="PartTime">Part Time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Work Location / Mode
                  </label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Remote / New York, NY"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Proposed Start Date
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Offer Expiry Date
                  </label>
                  <input
                    type="date"
                    value={formExpiryDate}
                    onChange={(e) => setFormExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Offer Terms, Benefits & Equity Notes
                </label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Health insurance coverage, 401(k) matching, 25 PTO days, equity stock options..."
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{actionLoading ? "Creating Draft..." : "Create Offer Draft"}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions for Existing Offer */}
        {offer && (
          <div className="px-6 py-4 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>

            <div className="flex items-center gap-2">
              {(offer.status === "Draft" || offer.status === "PendingApproval") && (
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Approve Offer</span>
                </button>
              )}

              {(offer.status === "Approved" || offer.status === "Draft") && (
                <button
                  type="button"
                  onClick={handleExtend}
                  disabled={actionLoading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Extend to Candidate</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
