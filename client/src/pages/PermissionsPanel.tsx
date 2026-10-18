/**
 * Legacy role/section matrix retired from effective authorization.
 *
 * Operational module and CRUD access is now granted per account through
 * User Management. Role and section tables are retained for compatibility
 * during migration, but editing them must not be presented as granting access.
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, UserCog } from "lucide-react";

export default function PermissionsPanel() {
  return (
    <div className="space-y-4" dir="rtl">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            إدارة الصلاحيات الفردية
          </CardTitle>
          <CardDescription>
            تم إيقاف مصفوفة صلاحيات الأدوار والأقسام كمصدر لمنح الوصول التشغيلي.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            الصلاحيات الفعالة تُقرأ من سجل <code>user_permissions</code> الخاص بكل مستخدم فقط.
            أي صلاحية غير مسجلة تُعامل كرفض افتراضي، وتغيير الدور وحده لا يمنح وصولاً إلى الموديولات.
          </p>
          <p>
            لمنح أو سحب صلاحية، افتح إدارة المستخدمين ثم اختر المستخدم واستخدم محرر الصلاحيات الفردية.
            تبقى ضوابط الإدارة الحساسة محمية بفحوص الدور على الخادم، بصورة منفصلة عن صلاحيات الموديولات.
          </p>
          <div className="flex items-start gap-2 rounded-md border border-border p-3 text-foreground">
            <UserCog className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              مهم: هذا التغيير في مصدر الصلاحيات لا يُغني عن استكمال فحص كل API endpoint
              ونطاق البيانات الخاص به؛ يجب ألا يُعتبر إخفاء الموديول في الواجهة حمايةً للخادم.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
