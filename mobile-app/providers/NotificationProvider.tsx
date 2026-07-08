import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { useAuth } from "./AuthProvider";
import { deletePushToken, registerPushToken } from "@/services/notifications/push";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    registerPushToken(user.uid).catch(() => {});
    return () => {
      deletePushToken(user.uid).catch(() => {});
    };
  }, [user]);

  return <>{children}</>;
}
