import { AppTheme } from "@/types/app";

export function resolveTheme(theme: AppTheme, system: "light" | "dark") {
  return theme === "system" ? system : theme;
}
