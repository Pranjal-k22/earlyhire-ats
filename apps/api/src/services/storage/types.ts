export type ResumeStorageDriver = "local" | "r2";

export interface StoredResumeResult {
  storedFilename: string;
  storageKey: string;
  storagePath: string;
  contentSha256: string;
  driver: ResumeStorageDriver;
  bucket?: string | null;
}

export interface IResumeStorageAdapter {
  readonly driver: ResumeStorageDriver;
  saveFile(buffer: Buffer, originalFilename: string, mimeType?: string): Promise<StoredResumeResult>;
  getReadStream(storageKey: string): Promise<NodeJS.ReadableStream>;
  deleteFile(storageKey: string): Promise<void>;
  fileExists(storageKey: string): Promise<boolean>;
}
