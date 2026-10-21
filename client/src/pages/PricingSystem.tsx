import { useEffect, useState } from "react";
import { ExternalLink, Calculator, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const PRICING_BASE_URL = "https://projectdash-mrvpkesv.manus.space";
const PRICING_PATH = "/brand/professor_kitchens/kitchens";
const SSO_CALLBACK_PATH = "/sso/pricing";

export default function PricingSystem() {
  const [launchUrl, setLaunchUrl] = useState("");
  const [launchError, setLaunchError] = useState("");
  const issueToken = trpc.pricingSystemSso.issueLaunchToken.useMutation();

  const refreshLaunchUrl = () => {
    setLaunchError("");
    setLaunchUrl("");
    issueToken.mutate(undefined, {
      onSuccess: ({ token }) => {
        const url = new URL(SSO_CALLBACK_PATH, PRICING_BASE_URL);
        url.searchParams.set("sso_token", token);
        url.searchParams.set("next", PRICING_PATH);
        setLaunchUrl(url.toString());
      },
      onError: (error) => {
        setLaunchError(error.message || "تعذر التحقق من صلاحية الوصول إلى منظومة التسعير");
        toast.error(error.message || "تعذر فتح منظومة التسعير");
      },
    });
  };

  useEffect(() => {
    refreshLaunchUrl();
    // A fresh, short-lived token is requested on each visit to this module.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <div className="flex flex-wrap gap-2">
          <Button onClick={refreshLaunchUrl} variant="outline" disabled={issueToken.isPending} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${issueToken.isPending ? "animate-spin" : ""}`} />
            تحديث جلسة التسعير
          </Button>
          <Button asChild variant="outline" disabled={!launchUrl} className="gap-2">
            <a href={launchUrl || undefined} target="_blank" rel="noreferrer">
              فتح في تبويب مستقل
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      {launchError && (
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <p className="font-semibold">تعذر فتح نظام التسعير</p>
          <p className="mt-1 text-muted-foreground">{launchError}</p>
          <p className="mt-2 text-muted-foreground">تأكد من أن لديك صلاحية المشاهدة في وحدة «منظومة التسعير» وأن متغير PRICING_SSO_SECRET مضبوط على الخادمَين.</p>
        </div>
      )}

      <Card className="overflow-hidden border-border/60 shadow-sm">
        <CardHeader className="border-b border-border/40 px-4 py-3 sm:px-5">
          <CardTitle className="text-sm font-medium">لوحة التسعير</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {launchUrl ? (
            <iframe title="منظومة التسعير" src={launchUrl} className="h-[calc(100vh-190px)] min-h-[620px] w-full border-0 bg-background" loading="eager" />
          ) : (
            <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 p-6 text-center">
              <RefreshCw className={`h-7 w-7 text-muted-foreground ${issueToken.isPending ? "animate-spin" : ""}`} />
              <p className="text-sm text-muted-foreground">{issueToken.isPending ? "جاري التحقق من صلاحياتك وفتح التسعير..." : "لا توجد جلسة تسعير نشطة"}</p>
              {!issueToken.isPending && <Button onClick={refreshLaunchUrl}>المحاولة مرة أخرى</Button>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
