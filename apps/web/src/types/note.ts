export interface NoteAuthor {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Note {
  id: string;
  candidateId: string;
  authorId: NoteAuthor;
  body: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NoteListResponse {
  success: boolean;
  data: {
    notes: Note[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export interface SingleNoteResponse {
  success: boolean;
  data: {
    note: Note;
  };
}

export interface DeleteNoteResponse {
  success: boolean;
  data: {
    id: string;
    deletedAt: string;
  };
}
