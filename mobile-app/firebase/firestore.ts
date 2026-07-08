import { getFirestore } from "firebase/firestore";
import { getFirebaseApp } from "./config";

export const db = getFirestore(getFirebaseApp());
