import { apiFetch } from "./client";
import { AppHealthSnapshot, RuntimeConfig } from "@/types/runtime";

export function getRuntimeConfigApi() {
  return apiFetch<RuntimeConfig>("/api/mobile/runtime/config", { auth: false });
}

export function getRuntimeHealthApi() {
  return apiFetch<AppHealthSnapshot>("/api/mobile/runtime/health");
}
