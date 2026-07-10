import { View } from "react-native";
import { router } from "expo-router";
import { AppText } from "@/components/ui/AppText";
import { AppButton } from "@/components/ui/AppButton";
import { useAdminProfile } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { useAdminSecurity } from "@/providers/AdminSecurityProvider";

export function AdminGuard({
  children,
  allowReadOnly = true,
}: {
  children: React.ReactNode;
  allowReadOnly?: boolean;
}) {
  const { user, loading } = useAuth();
  const { data: profile, isLoading } = useAdminProfile();
  const security = useAdminSecurity();

  if (loading || isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <AppText>Loading admin access...</AppText>
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <AppText className="text-center">Please login to access admin tools.</AppText>
        <AppButton title="Login" className="mt-4" onPress={() => router.replace("/auth/login")} />
      </View>
    );
  }

  if (!profile || profile.status === "disabled") {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <AppText className="text-center">You do not have admin access.</AppText>
      </View>
    );
  }

  if (!allowReadOnly && (profile.role === "viewer" || profile.role === "moderator")) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <AppText className="text-center">This action requires editor or super admin role.</AppText>
      </View>
    );
  }

  if (security.locked) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <AppText className="text-center">Admin area is locked.</AppText>
        <AppButton title="Unlock with Biometrics" className="mt-4" onPress={() => security.unlock()} />
      </View>
    );
  }

  return <>{children}</>;
}
