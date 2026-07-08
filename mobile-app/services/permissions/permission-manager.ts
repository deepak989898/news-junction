import * as Notifications from "expo-notifications";

export async function requestNotificationPermission() {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

export async function getNotificationPermission() {
  const settings = await Notifications.getPermissionsAsync();
  return settings.granted;
}

export async function requestCameraPermissionPlaceholder() {
  return false;
}

export async function requestMicrophonePermissionPlaceholder() {
  return false;
}
