import { randomUUID } from "crypto";

/** Public download URL compatible with Firebase Storage security rules. */
export function buildFirebaseStorageDownloadUrl(
  bucketName: string,
  filePath: string,
  downloadToken: string
): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(filePath)}?alt=media&token=${downloadToken}`;
}

export function createStorageDownloadToken(): string {
  return randomUUID();
}

export function isFirebaseStorageUrl(url: string): boolean {
  return url.includes("firebasestorage.googleapis.com") || url.includes("storage.googleapis.com");
}
