import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { doc, serverTimestamp, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/firebase/firestore";
import { requestNotificationPermission } from "@/services/permissions/permission-manager";

export async function registerPushToken(uid: string) {
  const granted = await requestNotificationPermission();
  if (!granted) return null;
  const token = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  });
  await setDoc(
    doc(db, "userPushTokens", uid),
    {
      uid,
      token: token.data,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  return token.data;
}

export async function deletePushToken(uid: string) {
  await deleteDoc(doc(db, "userPushTokens", uid));
}
