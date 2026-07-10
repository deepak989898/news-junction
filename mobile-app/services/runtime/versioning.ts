import * as Application from "expo-application";
import * as Linking from "expo-linking";
import { Platform } from "react-native";
import { RuntimeConfig } from "@/types/runtime";

function parse(v: string) {
  return v.split(".").map((n) => Number(n) || 0);
}

function compareVersions(a: string, b: string) {
  const pa = parse(a);
  const pb = parse(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const av = pa[i] || 0;
    const bv = pb[i] || 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }
  return 0;
}

export function getInstalledVersion() {
  return Application.nativeApplicationVersion || "0.0.0";
}

export function evaluateUpdate(config: RuntimeConfig) {
  const current = getInstalledVersion();
  const force = config.forceUpdate || compareVersions(current, config.minimumVersion) < 0;
  const optional = !force && (config.optionalUpdate || compareVersions(current, config.latestVersion) < 0);
  return { current, force, optional };
}

export async function openStorePage() {
  const url =
    Platform.OS === "ios"
      ? "itms-apps://itunes.apple.com/app/id0000000000"
      : "market://details?id=com.newsjunction.mobile";
  await Linking.openURL(url);
}
