import { ExternalLink, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PRICING_URL = "https://projectdash-mrvpkesv.manus.space/brand/professor_kitchens/kitchens";

export default function PricingSystem() {
  return (
    <div className="min-h-full space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Calculator className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold sm:text-2xl">منظومة التسعير</h1>
            <p className="text-sm text-muted-foreground">تسعير المطابخ — مع الحفاظ على السايدبار داخل المنصة</p>
          </div>
        </div>
        <Button asChild variant="outline" className="w-full gap-2 sm:w-auto">
          <a href={PRICING_URL} target="_blank" rel="noreferrer">
            فتح في تبويب مستقل
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>

      <Card className="overflow-hidden border-border/60 shadow-sm">
        <CardHeader className="border-b border-border/40 px-4 py-3 sm:px-5">
          <CardTitle className="text-sm font-medium">لوحة التسعير</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <iframe
            title="منظومة التسعير"
            src={PRICING_URL}
            className="h-[calc(100vh-190px)] min-h-[620px] w-full border-0 bg-background"
            loading="lazy"
          />
        </CardContent>
      </Card>
    </div>
  );
}
