import { UserRole } from "@/types";

export function isSuperAdmin(role?: UserRole | null): boolean {
  return role === "super_admin";
}

export function isEditor(role?: UserRole | null): boolean {
  return role === "super_admin" || role === "editor";
}

export function canDeleteNews(role?: UserRole | null): boolean {
  return isSuperAdmin(role);
}

export function canBulkDelete(role?: UserRole | null): boolean {
  return isSuperAdmin(role);
}

export function canManageSettings(role?: UserRole | null): boolean {
  return isSuperAdmin(role);
}

export function canManageAds(role?: UserRole | null): boolean {
  return isSuperAdmin(role);
}

export function canDeleteCategory(role?: UserRole | null): boolean {
  return isSuperAdmin(role);
}

export function canDeleteSource(role?: UserRole | null): boolean {
  return isSuperAdmin(role);
}

export function canDeleteMedia(role?: UserRole | null): boolean {
  return isSuperAdmin(role);
}

export function canEditNews(role?: UserRole | null): boolean {
  return isEditor(role);
}

export function canCreateNews(role?: UserRole | null): boolean {
  return isEditor(role);
}

export function canManageCategories(role?: UserRole | null): boolean {
  return isEditor(role);
}

export function canManageSources(role?: UserRole | null): boolean {
  return isEditor(role);
}

export function canUploadMedia(role?: UserRole | null): boolean {
  return isEditor(role);
}
