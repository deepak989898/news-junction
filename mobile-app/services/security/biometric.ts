import * as LocalAuthentication from "expo-local-authentication";

export async function canUseBiometric() {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && enrolled;
}

export async function promptBiometric(reason = "Authenticate to continue") {
  const available = await canUseBiometric();
  if (!available) return { success: false, error: "Biometric not available" };
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    fallbackLabel: "Use Passcode",
    cancelLabel: "Cancel",
    disableDeviceFallback: false,
  });
  return { success: result.success, error: result.success ? undefined : "Authentication failed" };
}
