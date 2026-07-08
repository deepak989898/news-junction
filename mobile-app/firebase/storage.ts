import { getStorage } from "firebase/storage";
import { getFirebaseApp } from "./config";

export const storage = getStorage(getFirebaseApp());
