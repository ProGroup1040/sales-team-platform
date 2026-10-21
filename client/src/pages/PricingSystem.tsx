import { useRef, useState } from "react";
import { ExternalLink, Calculator, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const PRICING_BASE_URL = "https://projectdash-mrvpkesv.manus.space";
const SSO_CALLBACK_PATH = "/sso/pricing";

export default function PricingSystem() {
  const [launchError, setLaunchError] = useState("");
  const [opening, setOpening] = useState(false);
  const targetWindowRef = useRef<Window | null>(null);
  const issueToken = trpc.pricingSystemSso.issueLaunchToken.useMutation();

  const openPricing = () => {
    setLaunchError("");

    // Open synchronously from the user's click to avoid popup blockers.
    const popup = window.open("about:blank", "_blank");
    if (!popup) {
      const message = "اسمح بفتح النوافذ المنبثقة لهذا الموقع ثم حاول مرة أخرى";
      setLaunchError(message);
      toast.error(message);
      return;
    }

    popup.name = `pricing-sso-${Date.now()}`;
    targetWindowRef.current = popup;
    try {
      popup.document.title = "جاري فتح منظومة التسعير";
      popup.document.body.textContent = "جاري التحقق من الصلاحيات وفتح منظومة التسعير...";
    } catch {
      // The handoff remains a POST; no credential is placed in a URL.
    }

    setOpening(true);
    issueToken.mutate(undefined, {
      onSuccess: ({ token }) => {
        const targetWindow = targetWindowRef.current;
        if (!targetWindow || targetWindow.closed) {
          setLaunchError("تعذر فتح نافذة التسعير. حاول مرة أخرى.");
          setOpening(false);
          return;
        }

        // Send the short-lived signed credential in a POST body, never in the URL.
        const form = document.createElement("form");
        form.method = "POST";
        form.action = new URL(SSO_CALLBACK_PATH, PRICING_BASE_URL).toString();
        form.target = targetWindow.name;
        form.acceptCharset = "UTF-8";

        const credential = document.createElement("input");
        credential.type = "hidden";
        credential.name = "token";
        credential.value = token;
        form.appendChild(credential);

        document.body.appendChild(form);
        form.submit();
        form.remove();
        setOpening(false);
      },
      onError: (error) => {
        targetWindowRef.current?.close();
        targetWindowRef.current = null;
        const message = error.message || "تعذر التحقق من صلاحية الوصول إلى منظومة التسعير";
        setLaunchError(message);
        toast.error(message);
        setOpening(false);
      },
    });
  };

  return (
    <div className="min-h-full space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Calculator className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold sm:text-2xl">منظومة التسعير</h1>
            <p className="text-sm text-muted-foreground">تسعير المطابخ بصلاحيات مرتبطة بحسابك في منظومة المبيعات</p>
          </div>
        </div>
        <Button onClick={openPricing} disabled={opening || issueToken.isPending} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${opening || issueToken.isPending ? "animate-spin" : ""}`} />
          {opening || issueToken.isPending ? "جاري فتح التسعير..." : "فتح منظومة التسعير"}
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>

      {launchError && (
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <p className="font-semibold">تعذر فتح نظام التسعير</p>
          <p className="mt-1 text-muted-foreground">{launchError}</p>
          <p className="mt-2 text-muted-foreground">تأكد من صلاحية المشاهدة وإعداد PRICING_SSO_SECRET في بيئتي التشغيل.</p>
        </div>
      )}

      <Card className="overflow-hidden border-border/60 shadow-sm">
        <CardHeader className="border-b border-border/40 px-4 py-3 sm:px-5">
          <CardTitle className="text-sm font-medium">لوحة التسعير</CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-[320px] flex-col items-center justify-center gap-3 p-6 text-center">
          <Calculator className="h-8 w-8 text-muted-foreground" />
          <p className="max-w-lg text-sm text-muted-foreground">
            يتم فتح نظام التسعير في تبويب مستقل بعد التحقق من صلاحيات حسابك. بيانات الدخول تُرسل عبر POST ولا تُضاف إلى رابط الصفحة.
          </p>
          <Button onClick={openPricing} disabled={opening || issueToken.isPending} variant="outline">
            فتح التسعير
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
