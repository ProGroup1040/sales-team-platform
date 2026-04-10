import { useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: session, isLoading } = trpc.localAuth.me.useQuery(undefined, {
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (isLoading) return;
    if (session) {
      setLocation("/overview");
    } else {
      setLocation("/login");
    }
  }, [isLoading, session, setLocation]);

  // Show spinner while checking session
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
}
