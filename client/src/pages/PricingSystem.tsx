import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, Calculator, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// Keep the production integration pinned to the public Pricing hostname.
// A VITE_* value pointing to localhost is resolved on the end user's device,
// not on the Windows host where the Pricing service is running.
const PRICING_BASE_URL = "https://pricingpro.bezaverse.com";
const SSO_CALLBACK_PATH = "/sso/pricing";
const EMBEDDED_FRAME_NAME = "pricing-embedded-frame";

function submitPricingSsoToken(token: string, target: string) {
  // The short-lived credential is sent in the POST body, never in the URL.
  const form = document.createElement("form");
  form.method = "POST";
  form.action = new URL(SSO_CALLBACK_PATH, PRICING_BASE_URL).toString();
  form.target = target;
  form.acceptCharset = "UTF-8";
  form.setAttribute("referrerpolicy", "no-referrer");

  const credential = document.createElement("input");
  credential.type = "hidden";
  credential.name = "token";
  credential.value = token;
  form.appendChild(credential);

  document.body.appendChild(form);
  form.submit();
  form.remove();
}

export default function PricingSystem() {
  const [launchError, setLaunchError] = useState("");
  const [frameLoading, setFrameLoading] = useState(true);
  const [frameReady, setFrameReady] = useState(false);
  const [openingNewTab, setOpeningNewTab] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const frameNavigationStartedRef = useRef(false);
  const issueToken = trpc.pricingSystemSso.issueLaunchToken.useMutation();

  const loadPricingInsidePlatform = useCallback(() => {
    setLaunchError("");
    setFrameLoading(true);
    setFrameReady(false);

    issueToken.mutate(undefined, {
      onSuccess: ({ token }) => {
        if (!iframeRef.current) {
          setFrameLoading(false);
          setLaunchError("تعذر تجهيز نافذة منظومة التسعير داخل المنصة.");
          return;
        }

        frameNavigationStartedRef.current = true;
        submitPricingSsoToken(token, EMBEDDED_FRAME_NAME);
      },
      onError: (error) => {
        const message = error.message || "تعذر التحقق من صلاحية الوصول إلى منظومة التسعير";
        setLaunchError(message);
        toast.error(message);
        setFrameLoading(false);
      },
    });
  }, [issueToken.mutate]);

  // Load Pricing automatically when the user opens its page in Sales Platform.
  useEffect(() => {
    loadPricingInsidePlatform();
  }, [loadPricingInsidePlatform]);

  const handleFrameLoad = () => {
    if (frameNavigationStartedRef.current) {
      setFrameLoading(false);
      setFrameReady(true);
    }
  };

  const openPricingInNewTab = () => {
    setLaunchError("");

    // Open synchronously during the click so the browser does not block the popup.
    const popup = window.open("about:blank", "_blank");
    if (!popup) {
      const message = "اسمح بفتح النوافذ المنبثقة لهذا الموقع ثم حاول مرة أخرى";
      setLaunchError(message);
      toast.error(message);
      return;
    }

    const targetName = `pricing-sso-${Date.now()}`;
    popup.name = targetName;
    try {
      popup.document.title = "جاري فتح منظومة التسعير";
      popup.document.body.textContent = "جاري التحقق من الصلاحيات وفتح منظومة التسعير...";
    } catch {
      // The SSO handoff remains a POST and does not expose credentials in the URL.
    }

    setOpeningNewTab(true);
    issueToken.mutate(undefined, {
      onSuccess: ({ token }) => {
        if (popup.closed) {
          setLaunchError("تم إغلاق نافذة التسعير قبل اكتمال تسجيل الدخول.");
          setOpeningNewTab(false);
          return;
        }

        submitPricingSsoToken(token, targetName);
        setOpeningNewTab(false);
      },
      onError: (error) => {
        popup.close();
        const message = error.message || "تعذر التحقق من صلاحية الوصول إلى منظومة التسعير";
        setLaunchError(message);
        toast.error(message);
        setOpeningNewTab(false);
      },
    });
  };

  return (
    <div className="min-h-full space-y-4 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Calculator className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold sm:text-2xl">منظومة التسعير</h1>
            <p className="text-sm text-muted-foreground">
              استخدم منظومة التسعير مباشرة من داخل منصة المبيعات وبنفس صلاحيات حسابك
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={loadPricingInsidePlatform}
            disabled={frameLoading || issueToken.isPending || openingNewTab}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            إعادة تحميل
          </Button>
          <Button
            onClick={openPricingInNewTab}
            disabled={openingNewTab || issueToken.isPending}
            className="gap-2"
          >
            {openingNewTab ? "جاري الفتح..." : "فتح في تبويب جديد"}
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {launchError && (
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <p className="font-semibold">تعذر فتح منظومة التسعير</p>
          <p className="mt-1 text-muted-foreground">{launchError}</p>
          <p className="mt-2 text-muted-foreground">
            تأكد من صلاحية المشاهدة وإعداد PRICING_SSO_SECRET في بيئتي التشغيل.
          </p>
          <Button
            onClick={loadPricingInsidePlatform}
            disabled={frameLoading || issueToken.isPending}
            size="sm"
            variant="outline"
            className="mt-3"
          >
            المحاولة مرة أخرى
          </Button>
        </div>
      )}

      <Card className="overflow-hidden border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/40 px-4 py-3">
          <CardTitle className="text-sm font-medium">لوحة التسعير</CardTitle>
          <span className="text-xs text-muted-foreground">
            {frameLoading ? "جاري الاتصال..." : frameReady ? "متصل" : "بانتظار التحميل"}
          </span>
        </CardHeader>
        <CardContent className="relative p-0">
          {frameLoading && (
            <div className="absolute inset-0 z-10 grid min-h-[520px] place-items-center bg-background/95">
              <div className="flex flex-col items-center gap-3 text-center">
                <RefreshCw className="h-7 w-7 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">جاري تسجيل الدخول وتحميل منظومة التسعير...</p>
              </div>
            </div>
          )}
          <iframe
            ref={iframeRef}
            name={EMBEDDED_FRAME_NAME}
            title="منظومة التسعير - Professor Kitchens"
            src="about:blank"
            onLoad={handleFrameLoad}
            className="h-[calc(100vh-220px)] min-h-[520px] w-full bg-background"
          />
        </CardContent>
      </Card>
    </div>
  );
}
