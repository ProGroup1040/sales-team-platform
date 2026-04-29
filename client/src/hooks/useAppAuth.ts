import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useEffect } from "react";

export type AppUser = {
  id: number;
  username: string;
  name: string;
  role: "sales_engineer" | "sales_specialist" | "admin_sales" | "manager";
  engineerId: number | null;
  permissions: Array<{
    module: string;
    canView: number;
    canAdd: number;
    canEdit: number;
    canDelete: number;
    dataScope: "own" | "all";
  }>;
};

export function useAppAuth() {
  const { data: user, isLoading } = trpc.appUsers.me.useQuery(undefined, {
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const utils = trpc.useUtils();
  const logoutMut = trpc.appUsers.logout.useMutation({
    onSuccess: () => {
      utils.appUsers.me.invalidate();
    },
  });

  return {
    user: user as AppUser | null | undefined,
    isLoading,
    isAuthenticated: !!user,
    isManager: user?.role === "manager",
    logout: () => logoutMut.mutate(),
  };
}

// Hook للتحقق من صلاحية معينة
export function usePermission(module: string) {
  const { user } = useAppAuth();

  if (!user) {
    return { canView: false, canAdd: false, canEdit: false, canDelete: false, dataScope: "own" as const };
  }

  // المدير له صلاحية كاملة
  if (user.role === "manager") {
    return { canView: true, canAdd: true, canEdit: true, canDelete: true, dataScope: "all" as const };
  }

  const perm = user.permissions?.find(p => p.module === module);
  if (!perm) {
    return { canView: false, canAdd: false, canEdit: false, canDelete: false, dataScope: "own" as const };
  }

  return {
    canView: !!perm.canView,
    canAdd: !!perm.canAdd,
    canEdit: !!perm.canEdit,
    canDelete: !!perm.canDelete,
    dataScope: perm.dataScope,
  };
}

// Hook للتحقق من أن المستخدم مسجل دخول
export function useRequireAppAuth() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAppAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  return { user, isLoading };
}
