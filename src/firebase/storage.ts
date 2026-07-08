import { ref, uploadBytes, getDownloadURL, deleteObject, FirebaseStorage } from "firebase/storage";

let storageInstance: FirebaseStorage | null = null;

function getStorageInstance(): FirebaseStorage {
  if (typeof window === "undefined") {
    throw new Error("Firebase Storage is only available on the client");
  }
  if (!storageInstance) {
    const { getStorage } = require("firebase/storage") as typeof import("firebase/storage");
    const { getFirebaseApp } = require("./config") as typeof import("./config");
    storageInstance = getStorage(getFirebaseApp());
  }
  return storageInstance;
}

export async function uploadNewsImage(file: File, newsId?: string): Promise<string> {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const path = newsId
    ? `news/${newsId}/${timestamp}-${safeName}`
    : `news/temp/${timestamp}-${safeName}`;

  const storageRef = ref(getStorageInstance(), path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function uploadMediaFile(file: File): Promise<{ url: string; path: string }> {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const path = `media/${timestamp}-${safeName}`;
  const storageRef = ref(getStorageInstance(), path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return { url, path };
}

export async function uploadSiteAsset(file: File, folder: "logo" | "favicon"): Promise<string> {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const path = `site/${folder}/${timestamp}-${safeName}`;
  const storageRef = ref(getStorageInstance(), path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function deleteStorageFile(fileUrl: string) {
  try {
    const storageRef = ref(getStorageInstance(), fileUrl);
    await deleteObject(storageRef);
  } catch {
    // File may be external URL or already deleted
  }
}

export async function deleteNewsImage(imageUrl: string) {
  return deleteStorageFile(imageUrl);
}
