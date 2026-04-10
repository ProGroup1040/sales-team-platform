import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useEffect } from "react";

export function useLocalAuth() {
  const { data: session, isLoading } = trpc.localAuth.me.useQuery(undefined, {
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  const utils = trpc.useUtils();
  const logoutMut = trpc.localAuth.logout.useMutation({
    onSuccess: () => {
      utils.localAuth.me.invalidate();
    },
  });

  return {
    session,
    isLoading,
    isAuthenticated: !!session,
    logout: () => logoutMut.mutate(),
  };
}

export function useRequireAuth() {
  const [, setLocation] = useLocation();
  const { session, isLoading } = useLocalAuth();

  useEffect(() => {
    if (!isLoading && !session) {
      setLocation("/login");
    }
  }, [session, isLoading, setLocation]);

  return { session, isLoading };
}
