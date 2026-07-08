import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  arrayUnion,
  arrayRemove,
  increment,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase/firestore";
import { COLLECTIONS } from "@/constants/collections";
import { NewsComment } from "@/types/news";

function mapComment(id: string, data: Record<string, unknown>): NewsComment {
  return {
    id,
    articleId: (data.articleId as string) || "",
    uid: (data.uid as string) || "",
    userName: (data.userName as string) || "Reader",
    userEmail: (data.userEmail as string) || "",
    text: (data.text as string) || "",
    parentId: (data.parentId as string) || null,
    likes: (data.likes as number) || 0,
    likedBy: (data.likedBy as string[]) || [],
    reported: Boolean(data.reported),
    createdAt: (data.createdAt as Timestamp) || null,
  };
}

export async function getArticleComments(articleId: string) {
  const q = query(
    collection(db, COLLECTIONS.comments),
    where("articleId", "==", articleId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => mapComment(d.id, d.data()));
}

export async function postComment(payload: {
  articleId: string;
  uid: string;
  userName: string;
  userEmail?: string;
  text: string;
  parentId?: string | null;
}) {
  const ref = await addDoc(collection(db, COLLECTIONS.comments), {
    ...payload,
    likes: 0,
    likedBy: [],
    reported: false,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function likeComment(commentId: string, uid: string, liked: boolean) {
  const ref = doc(db, COLLECTIONS.comments, commentId);
  await updateDoc(ref, {
    likes: increment(liked ? 1 : -1),
    likedBy: liked ? arrayUnion(uid) : arrayRemove(uid),
  });
}

export async function reportComment(commentId: string) {
  await updateDoc(doc(db, COLLECTIONS.comments, commentId), { reported: true });
}

export async function deleteOwnComment(commentId: string) {
  await deleteDoc(doc(db, COLLECTIONS.comments, commentId));
}
