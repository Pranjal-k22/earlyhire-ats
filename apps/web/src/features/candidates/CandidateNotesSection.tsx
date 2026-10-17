import React, { useEffect, useState, useCallback } from "react";
import { MessageSquare, Plus, Trash2, Loader2, User, Clock, AlertCircle } from "lucide-react";
import { Note } from "../../types/note";
import { fetchCandidateNotes, createCandidateNote, deleteCandidateNote } from "../../api/noteApi";

interface CandidateNotesSectionProps {
  candidateId: string;
}

export const CandidateNotesSection: React.FC<CandidateNotesSectionProps> = ({ candidateId }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newNoteBody, setNewNoteBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchCandidateNotes(candidateId);
      const list = Array.isArray(res.data) ? res.data : (res.data?.notes || []);
      setNotes(list);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load recruiter notes");
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newNoteBody.trim();
    if (!trimmed) {
      setSubmitError("Note body cannot be empty");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      await createCandidateNote(candidateId, { body: trimmed });
      setNewNoteBody("");
      await loadNotes();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save recruiter note");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      setDeletingId(noteId);
      await deleteCandidateNote(noteId, candidateId);
      await loadNotes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete note");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-brand-600" />
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Recruiter Notes ({notes.length})
          </h4>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadNotes}
            className="text-xs font-semibold underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Add Note Form */}
      <form onSubmit={handleAddNote} className="space-y-2">
        <textarea
          aria-label="Add a recruiter note"
          rows={3}
          value={newNoteBody}
          onChange={(e) => setNewNoteBody(e.target.value)}
          placeholder="Add an internal observation, interview impression, or candidate feedback..."
          className="w-full text-xs rounded-xl border border-slate-200 p-3 text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all resize-none bg-slate-50/50 focus:bg-white"
        />

        {submitError && (
          <p className="text-[11px] text-rose-600 font-medium">{submitError}</p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !newNoteBody.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Add Note</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Notes List */}
      <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
        {loading ? (
          <div className="py-6 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin text-brand-500 mb-1" />
            <p className="text-xs">Loading notes...</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="py-6 text-center border border-dashed border-slate-200 rounded-xl">
            <p className="text-xs text-slate-400">No recruiter notes yet.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Leave interview impressions or notes for your team above.
            </p>
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all text-xs space-y-1.5 group"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                  <User className="w-3 h-3 text-slate-400" />
                  {note.authorId?.name || "Recruiter"}
                  {note.authorId?.role && (
                    <span className="font-normal text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-600">
                      {note.authorId.role}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(note.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteNote(note.id)}
                    disabled={deletingId === note.id}
                    className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors"
                    title="Delete note"
                    aria-label="Delete note"
                  >
                    {deletingId === note.id ? (
                      <Loader2 className="w-3 h-3 animate-spin text-rose-500" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>

              {/* Note Content - Rendered strictly as safe plain text */}
              <p className="text-slate-800 whitespace-pre-wrap leading-relaxed text-xs">
                {note.body}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
