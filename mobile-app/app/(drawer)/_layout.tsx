import { Drawer } from "expo-router/drawer";

export default function DrawerLayout() {
  return (
    <Drawer screenOptions={{ headerShown: false }}>
      <Drawer.Screen name="index" options={{ title: "Settings" }} />
      <Drawer.Screen name="about" options={{ title: "About" }} />
      <Drawer.Screen name="privacy" options={{ title: "Privacy Policy" }} />
      <Drawer.Screen name="terms" options={{ title: "Terms" }} />
      <Drawer.Screen name="help" options={{ title: "Help" }} />
      <Drawer.Screen name="notification-settings" options={{ title: "Notification Settings" }} />
      <Drawer.Screen name="language-settings" options={{ title: "Language Settings" }} />
      <Drawer.Screen name="theme-settings" options={{ title: "Theme Settings" }} />
    </Drawer>
  );
}
