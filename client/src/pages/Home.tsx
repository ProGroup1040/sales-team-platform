import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/overview");
  }, [setLocation]);

  // Show spinner while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
}
