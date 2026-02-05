import { useQuery } from "@tanstack/react-query";
import type { PermissionKey } from "@shared/schema";

interface PermissionsResponse {
  permissions: Record<string, boolean>;
  role: string;
}

export function usePermissions() {
  const { data, isLoading } = useQuery<PermissionsResponse>({
    queryKey: ["/api/permissions/me"],
    staleTime: 60000,
  });

  const hasPermission = (key: PermissionKey): boolean => {
    if (!data) return false;
    if (data.role === "super_admin") return true;
    return data.permissions[key] ?? false;
  };

  const isSuperAdmin = data?.role === "super_admin";
  const isAdmin = data?.role === "admin" || isSuperAdmin;
  const isStaff = data?.role === "staff" || isAdmin;

  return {
    permissions: data?.permissions ?? {},
    role: data?.role ?? "user",
    isLoading,
    hasPermission,
    isSuperAdmin,
    isAdmin,
    isStaff,
  };
}
