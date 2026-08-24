import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useLocalAuth } from "@/hooks/useLocalAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Users, UserPlus, Shield, Key, Eye, EyeOff, Settings,
  Activity, Lock, Unlock, Edit, RefreshCw, CheckCircle2,
  AlertCircle, Mail, User, AtSign, Loader2
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Role = "sales_engineer" | "sales_specialist" | "admin_sales" | "manager";
type Module = "crm" | "visits" | "deals" | "kpi" | "planning" | "discounts" | "reports" | "tasks" | "collections" | "users";

const ROLE_LABELS: Record<Role, string> = {
  sales_engineer: "مهندس مبيعات",
  sales_specialist: "أخصائي مبيعات",
  admin_sales: "مشرف مبيعات",
  manager: "مدير",
};

const ROLE_COLORS: Record<Role, string> = {
  sales_engineer: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  sales_specialist: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  admin_sales: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  manager: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const MODULE_LABELS: Record<Module, string> = {
  crm: "إدارة العملاء",
  visits: "المعاينات",
  deals: "الصفقات",
  kpi: "مؤشرات الأداء",
  planning: "تخطيط الأهداف",
  discounts: "الخصومات",
  reports: "التقارير",
  tasks: "المهام",
  collections: "التحصيل",
  users: "إدارة المستخدمين",
};

const MODULES: Module[] = ["crm", "visits", "deals", "kpi", "planning", "discounts", "reports", "tasks", "collections", "users"];

// ─── Validation Helpers ───────────────────────────────────────────────────────
function validateCreateForm(form: { name: string; username: string; password: string; email: string }): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = "الاسم الكامل مطلوب";
  else if (form.name.trim().length < 2) errors.name = "الاسم يجب أن يكون حرفين على الأقل";

  if (!form.username.trim()) errors.username = "اسم المستخدم مطلوب";
  else if (form.username.trim().length < 3) errors.username = "اسم المستخدم يجب أن يكون 3 أحرف على الأقل";
  else if (!/^[a-zA-Z0-9._-]+$/.test(form.username.trim())) errors.username = "يجب أن يحتوي على حروف إنجليزية وأرقام فقط";

  if (!form.password) errors.password = "كلمة المرور مطلوبة";
  else if (form.password.length < 6) errors.password = "كلمة المرور يجب أن تكون 6 أحرف على الأقل";

  if (form.email && form.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) errors.email = "صيغة البريد الإلكتروني غير صحيحة";
  }
  return errors;
}

// ─── Field Error Component ────────────────────────────────────────────────────
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  );
}

// ─── Create User Form ─────────────────────────────────────────────────────────
function CreateUserForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    email: "",
    role: "sales_engineer" as Role,
    engineerId: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const engineersQuery = trpc.engineers.list.useQuery(undefined, { staleTime: 60000 });

  const createMut = trpc.appUsers.create.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء المستخدم بنجاح", {
        description: `المستخدم "${form.username}" جاهز لتسجيل الدخول`,
      });
      setForm({ name: "", username: "", password: "", email: "", role: "sales_engineer", engineerId: "" });
      setFieldErrors({});
      setTouched({});
      onSuccess();
    },
    onError: (e) => {
      const msg = e.message || "حدث خطأ أثناء إنشاء المستخدم";
      console.error("[CreateUser] Error:", e);
      if (msg.includes("اسم المستخدم موجود")) {
        setFieldErrors(prev => ({ ...prev, username: "اسم المستخدم موجود بالفعل، اختر اسماً آخر" }));
        toast.error("اسم المستخدم مستخدم بالفعل");
      } else if (msg.includes("البريد الإلكتروني مستخدم")) {
        setFieldErrors(prev => ({ ...prev, email: "البريد الإلكتروني مستخدم بالفعل" }));
        toast.error("البريد الإلكتروني مستخدم بالفعل");
      } else if (msg.includes("خطأ في الخادم")) {
        toast.error("خطأ في الخادم، يرجى المحاولة مرة أخرى");
      } else {
        toast.error(msg);
      }
    },
  });

  const handleBlur = useCallback((field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const errors = validateCreateForm(form);
    setFieldErrors(prev => ({ ...prev, [field]: errors[field] || "" }));
  }, [form]);

  const handleChange = useCallback((field: string, value: string) => {
    const newForm = { ...form, [field]: value };
    setForm(newForm);
    if (touched[field]) {
      const errors = validateCreateForm(newForm);
      setFieldErrors(prev => ({ ...prev, [field]: errors[field] || "" }));
    }
  }, [form, touched]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const allTouched = { name: true, username: true, password: true, email: true };
    setTouched(allTouched);
    const errors = validateCreateForm(form);
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) {
      toast.error("يرجى تصحيح الأخطاء قبل المتابعة");
      return;
    }
    createMut.mutate({
      name: form.name.trim(),
      username: form.username.trim().toLowerCase(),
      password: form.password,
      role: form.role,
      engineerId: form.engineerId && form.engineerId !== "none" ? parseInt(form.engineerId) : undefined,
      email: form.email.trim() || undefined,
    });
  };

  const isLoading = createMut.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
      {/* Name + Username */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="flex items-center gap-1">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            الاسم الكامل <span className="text-red-400">*</span>
          </Label>
          <Input
            placeholder="أحمد محمد"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            onBlur={() => handleBlur("name")}
            className={touched.name && fieldErrors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
            disabled={isLoading}
          />
          {touched.name && <FieldError message={fieldErrors.name} />}
        </div>
        <div className="space-y-1">
          <Label className="flex items-center gap-1">
            <AtSign className="h-3.5 w-3.5 text-muted-foreground" />
            اسم المستخدم <span className="text-red-400">*</span>
          </Label>
          <Input
            placeholder="ahmed.m"
            value={form.username}
            onChange={(e) => handleChange("username", e.target.value.toLowerCase())}
            onBlur={() => handleBlur("username")}
            dir="ltr"
            className={touched.username && fieldErrors.username ? "border-red-500 focus-visible:ring-red-500" : ""}
            disabled={isLoading}
          />
          {touched.username && <FieldError message={fieldErrors.username} />}
        </div>
      </div>

      {/* Password */}
      <div className="space-y-1">
        <Label className="flex items-center gap-1">
          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          كلمة المرور <span className="text-red-400">*</span>
        </Label>
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="6 أحرف على الأقل"
            value={form.password}
            onChange={(e) => handleChange("password", e.target.value)}
            onBlur={() => handleBlur("password")}
            dir="ltr"
            className={`pl-10 ${touched.password && fieldErrors.password ? "border-red-500 focus-visible:ring-red-500" : ""}`}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {touched.password && <FieldError message={fieldErrors.password} />}
        {!fieldErrors.password && form.password.length > 0 && (
          <div className="flex items-center gap-2 mt-1">
            <div className="flex gap-1 flex-1">
              {[1,2,3].map(i => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                  form.password.length >= i * 4 ? (i === 3 ? "bg-emerald-500" : i === 2 ? "bg-yellow-500" : "bg-red-500") : "bg-muted"
                }`} />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {form.password.length >= 10 ? "قوية" : form.password.length >= 6 ? "متوسطة" : "ضعيفة"}
            </span>
          </div>
        )}
      </div>

      {/* Email */}
      <div className="space-y-1">
        <Label className="flex items-center gap-1">
          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
          البريد الإلكتروني <span className="text-xs text-muted-foreground">(اختياري)</span>
        </Label>
        <Input
          type="email"
          placeholder="ahmed@company.com"
          value={form.email}
          onChange={(e) => handleChange("email", e.target.value)}
          onBlur={() => handleBlur("email")}
          dir="ltr"
          className={touched.email && fieldErrors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
          disabled={isLoading}
        />
        {touched.email && <FieldError message={fieldErrors.email} />}
      </div>

      {/* Role + Engineer */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>الدور <span className="text-red-400">*</span></Label>
          <Select value={form.role} onValueChange={(v) => setForm(p => ({ ...p, role: v as Role }))} disabled={isLoading}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ROLE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>ربط بمهندس <span className="text-xs text-muted-foreground">(اختياري)</span></Label>
          <Select value={form.engineerId} onValueChange={(v) => setForm(p => ({ ...p, engineerId: v }))} disabled={isLoading}>
            <SelectTrigger>
              <SelectValue placeholder="اختر مهندس" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">بدون ربط</SelectItem>
              {engineersQuery.data?.map((eng: any) => (
                <SelectItem key={eng.id} value={String(eng.id)}>{eng.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Submit */}
      <Button type="submit" className="w-full gap-2" disabled={isLoading}>
        {isLoading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> جارٍ الإنشاء...</>
        ) : (
          <><UserPlus className="h-4 w-4" /> إنشاء المستخدم</>
        )}
      </Button>
    </form>
  );
}

// ─── Permissions Editor ───────────────────────────────────────────────────────
function PermissionsEditor({ userId, userName, onClose }: { userId: number; userName: string; onClose: () => void }) {
  const permsQuery = trpc.appUsers.getPermissions.useQuery({ userId }, { staleTime: 0 });
  const updateMut = trpc.appUsers.updatePermissions.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الصلاحيات بنجاح");
      onClose();
    },
    onError: (e) => toast.error(e.message || "حدث خطأ"),
  });

  const [perms, setPerms] = useState<Record<string, { canView: number; canAdd: number; canEdit: number; canDelete: number; dataScope: "own" | "all" }>>({});
  const [initialized, setInitialized] = useState(false);

  if (permsQuery.data && !initialized) {
    const p: typeof perms = {};
    permsQuery.data.forEach((perm: any) => {
      p[perm.module] = {
        canView: perm.canView,
        canAdd: perm.canAdd,
        canEdit: perm.canEdit,
        canDelete: perm.canDelete,
        dataScope: perm.dataScope,
      };
    });
    setPerms(p);
    setInitialized(true);
  }

  const togglePerm = (module: string, key: "canView" | "canAdd" | "canEdit" | "canDelete") => {
    setPerms(p => ({ ...p, [module]: { ...p[module], [key]: p[module]?.[key] ? 0 : 1 } }));
  };

  const setScope = (module: string, scope: string) => {
    setPerms(p => ({ ...p, [module]: { ...p[module], dataScope: scope as "own" | "all" } }));
  };

  const handleSave = () => {
    const permissions = MODULES.map(mod => ({
      module: mod,
      canView: perms[mod]?.canView ?? 0,
      canAdd: perms[mod]?.canAdd ?? 0,
      canEdit: perms[mod]?.canEdit ?? 0,
      canDelete: perms[mod]?.canDelete ?? 0,
      dataScope: perms[mod]?.dataScope ?? "own",
    }));
    updateMut.mutate({ userId, permissions });
  };

  if (permsQuery.isLoading) return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-4" dir="rtl">
      <p className="text-sm text-muted-foreground">
        تعديل صلاحيات: <span className="text-foreground font-medium">{userName}</span>
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-right py-2 pr-2 font-medium text-muted-foreground">القسم</th>
              <th className="text-center py-2 px-1 font-medium text-muted-foreground">عرض</th>
              <th className="text-center py-2 px-1 font-medium text-muted-foreground">إضافة</th>
              <th className="text-center py-2 px-1 font-medium text-muted-foreground">تعديل</th>
              <th className="text-center py-2 px-1 font-medium text-muted-foreground">حذف</th>
              <th className="text-center py-2 px-1 font-medium text-muted-foreground">نطاق البيانات</th>
            </tr>
          </thead>
          <tbody>
            {MODULES.map(mod => {
              const p = perms[mod] ?? { canView: 0, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" as const };
              return (
                <tr key={mod} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-2 pr-2 font-medium">{MODULE_LABELS[mod]}</td>
                  {(["canView", "canAdd", "canEdit", "canDelete"] as const).map(key => (
                    <td key={key} className="text-center py-2 px-1">
                      <Switch
                        checked={!!p[key]}
                        onCheckedChange={() => togglePerm(mod, key)}
                        className="scale-75"
                      />
                    </td>
                  ))}
                  <td className="text-center py-2 px-1">
                    <Select value={p.dataScope} onValueChange={(v) => setScope(mod, v)}>
                      <SelectTrigger className="h-7 text-xs w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="own">بياناته فقط</SelectItem>
                        <SelectItem value="all">كل البيانات</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex gap-3 pt-2">
        <Button className="flex-1 gap-2" onClick={handleSave} disabled={updateMut.isPending}>
          {updateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          حفظ الصلاحيات
        </Button>
        <Button variant="outline" onClick={onClose}>إلغاء</Button>
      </div>
    </div>
  );
}

// ─── Edit User Form ────────────────────────────────────────────────────────────
function EditUserForm({ user, onSuccess }: { user: any; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: user.name || "",
    role: user.role || "sales_engineer",
    status: user.status || "active",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateMut = trpc.appUsers.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث المستخدم بنجاح");
      onSuccess();
    },
    onError: (e) => {
      console.error("[EditUser] Error:", e);
      toast.error(e.message || "حدث خطأ أثناء التحديث");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "الاسم مطلوب";
    if (form.password && form.password.length < 6) newErrors.password = "كلمة المرور يجب أن تكون 6 أحرف على الأقل";
    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) return;

    updateMut.mutate({
      userId: user.id,
      name: form.name.trim(),
      role: form.role as Role,
      status: form.status as "active" | "inactive",
      password: form.password || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
      <div className="space-y-1">
        <Label>الاسم الكامل *</Label>
        <Input
          value={form.name}
          onChange={(e) => { setForm(p => ({ ...p, name: e.target.value })); setErrors(p => ({ ...p, name: "" })); }}
          className={errors.name ? "border-red-500" : ""}
          disabled={updateMut.isPending}
        />
        <FieldError message={errors.name} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>الدور</Label>
          <Select value={form.role} onValueChange={(v) => setForm(p => ({ ...p, role: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(ROLE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>الحالة</Label>
          <Select value={form.status} onValueChange={(v) => setForm(p => ({ ...p, status: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="inactive">موقوف</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <Label>كلمة مرور جديدة <span className="text-xs text-muted-foreground">(اتركها فارغة للإبقاء على الحالية)</span></Label>
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="6 أحرف على الأقل"
            value={form.password}
            onChange={(e) => { setForm(p => ({ ...p, password: e.target.value })); setErrors(p => ({ ...p, password: "" })); }}
            dir="ltr"
            className={`pl-10 ${errors.password ? "border-red-500" : ""}`}
            disabled={updateMut.isPending}
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" tabIndex={-1}>
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <FieldError message={errors.password} />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" className="flex-1 gap-2" disabled={updateMut.isPending}>
          {updateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
          حفظ التعديلات
        </Button>
      </div>
    </form>
  );
}

// ─── Activity Logs ─────────────────────────────────────────────────────────────
function ActivityLogsView() {
  const logsQuery = trpc.appUsers.activityLogs.useQuery({ limit: 50 }, { staleTime: 30000 });

  if (logsQuery.isLoading) return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );

  if (!logsQuery.data?.length) return (
    <div className="text-center py-8 text-muted-foreground">
      <Activity className="h-10 w-10 mx-auto mb-2 opacity-30" />
      <p>لا توجد سجلات نشاط بعد</p>
    </div>
  );

  return (
    <div className="space-y-2">
      {logsQuery.data.map((log: any) => (
        <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
          <Activity className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{log.details || log.action}</p>
            <p className="text-xs text-muted-foreground">
              {log.module && (
                <span className="ml-2 bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs">{log.module}</span>
              )}
              {new Date(log.createdAt).toLocaleString("ar-SA")}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ──// ─── Engineers Accounts Tab ───────────────────────────────────────────────
function EngineersAccountsTab() {
  const utils = trpc.useUtils();
  const [bulkOpen, setBulkOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedEng, setSelectedEng] = useState<any>(null);
  const [resetEngId, setResetEngId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [createForm, setCreateForm] = useState({ username: "", password: "12345678", forceChange: true });

  const listQuery = trpc.appUsers.listEngineers.useQuery(undefined, { staleTime: 15000 });

  const bulkMut = trpc.appUsers.bulkCreateAccounts.useMutation({
    onSuccess: (data) => {
      toast.success(`تم إنشاء ${data.created.length} حساب تلقائياً`, {
        description: data.skipped.length > 0 ? `تم تخطي المهندسين الذين لديهم حسابات بالفعل (${data.skipped.length})` : undefined,
      });
      setBulkOpen(false);
      utils.appUsers.listEngineers.invalidate();
    },
    onError: (e) => toast.error(e.message || "حدث خطأ"),
  });

  const createMut = trpc.appUsers.createEngineerAccount.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء الحساب بنجاح");
      setCreateOpen(false);
      setSelectedEng(null);
      setCreateForm({ username: "", password: "12345678", forceChange: true });
      utils.appUsers.listEngineers.invalidate();
    },
    onError: (e) => toast.error(e.message || "حدث خطأ"),
  });

  const resetMut = trpc.appUsers.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("تم إعادة تعيين كلمة المرور بنجاح");
      setResetEngId(null);
      setNewPassword("");
      utils.appUsers.listEngineers.invalidate();
    },
    onError: (e) => toast.error(e.message || "حدث خطأ"),
  });

  const toggleMut = trpc.appUsers.toggleStatus.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة الحساب");
      utils.appUsers.listEngineers.invalidate();
    },
    onError: (e) => toast.error(e.message || "حدث خطأ"),
  });

  const engineers = listQuery.data ?? [];
  const withAccount = engineers.filter((e: any) => e.hasAccount);
  const withoutAccount = engineers.filter((e: any) => !e.hasAccount);

  const SALES_ROLES = ["sales_engineer", "sales_specialist", "admin_sales", "manager", "engineer", "admin"];
  const salesEngineers = engineers.filter((e: any) => SALES_ROLES.includes(e.role));

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span>{withAccount.length} مهندس لديه حساب</span>
          <span className="text-border">|</span>
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <span>{withoutAccount.length} بدون حساب</span>
        </div>
        <div className="flex gap-2">
          <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2" disabled={withoutAccount.length === 0}>
                <RefreshCw className="h-4 w-4" />
                إنشاء تلقائي ({withoutAccount.length})
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogDescription className="sr-only">تفاصيل النافذة.</DialogDescription>
                <DialogTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  إنشاء حسابات تلقائية
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <Alert>
                  <AlertDescription className="text-sm">
                    سيتم إنشاء حسابات لـ <strong>{withoutAccount.length}</strong> مهندس بدون حساب حالياً.
                    كلمة المرور الافتراضية: <code className="bg-muted px-1 rounded">12345678</code>
                    وسيتم إجبار كل مهندس على تغييرها عند أول دخول.
                  </AlertDescription>
                </Alert>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {withoutAccount.map((e: any) => (
                    <div key={e.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                      <span>{e.name}</span>
                      <Badge variant="outline" className="text-xs">{e.role}</Badge>
                    </div>
                  ))}
                </div>
                <Button
                  className="w-full"
                  onClick={() => bulkMut.mutate({ defaultPassword: "12345678" })}
                  disabled={bulkMut.isPending}
                >
                  {bulkMut.isPending ? (
                    <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />جاري الإنشاء...</span>
                  ) : (
                    `إنشاء ${withoutAccount.length} حساب تلقائياً`
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Engineers List */}
      {listQuery.isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <div className="space-y-2">
        {salesEngineers.map((eng: any) => (
          <Card key={eng.id} className={`border-border/50 ${!eng.hasAccount ? 'border-amber-500/30 bg-amber-500/5' : ''}`}>
            <CardContent className="p-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: eng.hasAccount ? 'hsl(var(--primary)/0.1)' : 'hsl(38 92% 50% / 0.1)' }}>
                  <span className="text-sm font-bold" style={{ color: eng.hasAccount ? 'hsl(var(--primary))' : 'hsl(38 92% 50%)' }}>
                    {eng.name?.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{eng.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    {eng.hasAccount ? (
                      <span dir="ltr" className="flex items-center gap-1">
                        <AtSign className="h-3 w-3" />{eng.username}
                      </span>
                    ) : (
                      <span className="text-amber-500">بدون حساب</span>
                    )}
                    <Badge variant="outline" className="text-xs">{eng.role}</Badge>
                  </div>
                </div>
                {eng.hasAccount && (
                  <div className="flex items-center gap-1">
                    {eng.status === 'active' ? (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">نشط</Badge>
                    ) : (
                      <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-xs">موقوف</Badge>
                    )}
                    {eng.forcePasswordChange && (
                      <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs">يجب تغيير كلمة المرور</Badge>
                    )}
                  </div>
                )}
                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {!eng.hasAccount ? (
                    <Dialog open={createOpen && selectedEng?.id === eng.id} onOpenChange={(open) => { setCreateOpen(open); if (!open) setSelectedEng(null); }}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="gap-1" onClick={() => { setSelectedEng(eng); setCreateForm({ username: eng.name?.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '') || '', password: '12345678', forceChange: true }); }}>
                          <UserPlus className="h-3.5 w-3.5" />
                          إنشاء حساب
                        </Button>
                      </DialogTrigger>
                      <DialogContent dir="rtl">
                        <DialogHeader>
                          <DialogDescription className="sr-only">تفاصيل النافذة.</DialogDescription>
                          <DialogTitle>إنشاء حساب: {eng.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 py-2">
                          <div className="space-y-1">
                            <Label>اسم المستخدم</Label>
                            <Input dir="ltr" value={createForm.username} onChange={(e) => setCreateForm(p => ({ ...p, username: e.target.value }))} placeholder="ahmed.ali" />
                          </div>
                          <div className="space-y-1">
                            <Label>كلمة المرور</Label>
                            <Input dir="ltr" type="password" value={createForm.password} onChange={(e) => setCreateForm(p => ({ ...p, password: e.target.value }))} />
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch checked={createForm.forceChange} onCheckedChange={(v) => setCreateForm(p => ({ ...p, forceChange: v }))} />
                            <Label className="text-sm">إجبار تغيير كلمة المرور عند أول دخول</Label>
                          </div>
                          <Button className="w-full" disabled={createMut.isPending}
                            onClick={() => createMut.mutate({ engineerId: eng.id, username: createForm.username, password: createForm.password, forceChange: createForm.forceChange })}>
                            {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'إنشاء الحساب'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <>
                      {/* Reset Password */}
                      <Dialog open={resetEngId === eng.id} onOpenChange={(open) => { if (!open) { setResetEngId(null); setNewPassword(''); } }}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-1" onClick={() => setResetEngId(eng.id)}>
                            <Key className="h-3.5 w-3.5" />
                            إعادة كلمة المرور
                          </Button>
                        </DialogTrigger>
                        <DialogContent dir="rtl">
                          <DialogHeader>
                            <DialogDescription className="sr-only">تفاصيل النافذة.</DialogDescription>
                            <DialogTitle>إعادة كلمة مرور: {eng.name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-3 py-2">
                            <Input dir="ltr" type="password" placeholder="كلمة المرور الجديدة" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                            <Button className="w-full" disabled={resetMut.isPending || !newPassword}
                              onClick={() => resetMut.mutate({ engineerId: eng.id, newPassword })}>
                              {resetMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'حفظ كلمة المرور'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      {/* Toggle Status */}
                      <Button variant="outline" size="sm" className="gap-1"
                        disabled={toggleMut.isPending}
                        onClick={() => toggleMut.mutate({ engineerId: eng.id, status: eng.status === 'active' ? 'inactive' : 'active' })}>
                        {eng.status === 'active' ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                        {eng.status === 'active' ? 'تعطيل' : 'تفعيل'}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────
export default function UserManagement() {
  const { session } = useLocalAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [permUser, setPermUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const usersQuery = trpc.appUsers.list.useQuery(undefined, { staleTime: 30000 });

  // التحقق من صلاحية الوصول
  if (!session) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <Lock className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">يجب تسجيل الدخول أولاً</p>
        </div>
      </div>
    );
  }

  if (session.role !== "manager" && session.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <Shield className="h-12 w-12 text-red-400 mx-auto" />
          <p className="text-muted-foreground">ليس لديك صلاحية الوصول لهذه الصفحة</p>
          <p className="text-xs text-muted-foreground">هذه الصفحة مخصصة للمدير فقط</p>
        </div>
      </div>
    );
  }

  const filteredUsers = usersQuery.data?.filter((u: any) =>
    !searchQuery ||
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  ) ?? [];

  const activeCount = usersQuery.data?.filter((u: any) => u.status === "active").length ?? 0;
  const totalCount = usersQuery.data?.length ?? 0;

  return (
    <div className="space-y-6 p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            إدارة المستخدمين
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            إنشاء وإدارة حسابات المستخدمين والصلاحيات
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              إضافة مستخدم جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogDescription className="sr-only">تفاصيل النافذة.</DialogDescription>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                إنشاء مستخدم جديد
              </DialogTitle>
            </DialogHeader>
            <CreateUserForm onSuccess={() => { setCreateOpen(false); usersQuery.refetch(); }} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCount}</p>
              <p className="text-xs text-muted-foreground">إجمالي المستخدمين</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Unlock className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-500">{activeCount}</p>
              <p className="text-xs text-muted-foreground">مستخدمون نشطون</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <Lock className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-400">{totalCount - activeCount}</p>
              <p className="text-xs text-muted-foreground">موقوفون</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="engineers">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="engineers">حسابات المهندسين</TabsTrigger>
          <TabsTrigger value="users">مستخدمو النظام</TabsTrigger>
          <TabsTrigger value="logs">سجل النشاط</TabsTrigger>
        </TabsList>

        {/* Engineers Accounts Tab */}
        <TabsContent value="engineers" className="mt-4 space-y-4">
          <EngineersAccountsTab />
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-4 space-y-4">
          {/* Search */}
          <Input
            placeholder="بحث بالاسم أو اسم المستخدم أو البريد..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {/* Error State */}
          {usersQuery.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  {usersQuery.error?.message?.includes("UNAUTHORIZED")
                    ? "انتهت جلستك، يرجى تسجيل الدخول مجدداً"
                    : "حدث خطأ في تحميل المستخدمين"}
                </span>
                <Button variant="link" size="sm" className="h-auto p-0 text-red-400" onClick={() => usersQuery.refetch()}>
                  إعادة المحاولة
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Loading */}
          {usersQuery.isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Empty */}
          {!usersQuery.isLoading && !usersQuery.isError && filteredUsers.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">
                {searchQuery ? "لا توجد نتائج للبحث" : "لا يوجد مستخدمون بعد"}
              </p>
              {!searchQuery && (
                <p className="text-sm mt-1">اضغط على "إضافة مستخدم جديد" لإنشاء أول مستخدم</p>
              )}
            </div>
          )}

          {/* Users List */}
          <div className="space-y-3">
            {filteredUsers.map((user: any) => (
              <Card key={user.id} className="border-border/50 hover:border-border transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Avatar + Info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-primary">
                          {user.name?.charAt(0) || "U"}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{user.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap" dir="ltr">
                          <span>@{user.username}</span>
                          {user.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Role Badge */}
                    <Badge className={`text-xs border shrink-0 ${ROLE_COLORS[user.role as Role] || ""}`}>
                      {ROLE_LABELS[user.role as Role] || user.role}
                    </Badge>

                    {/* Status */}
                    <div className="flex items-center gap-1 shrink-0">
                      {user.status === "active" ? (
                        <><Unlock className="h-3.5 w-3.5 text-emerald-500" /><span className="text-xs text-emerald-500">نشط</span></>
                      ) : (
                        <><Lock className="h-3.5 w-3.5 text-red-400" /><span className="text-xs text-red-400">موقوف</span></>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Edit */}
                      <Dialog open={editUser?.id === user.id} onOpenChange={(open) => !open && setEditUser(null)}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setEditUser(user)} className="gap-1">
                            <Edit className="h-3.5 w-3.5" />
                            تعديل
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md" dir="rtl">
                          <DialogHeader>
                            <DialogDescription className="sr-only">تفاصيل النافذة.</DialogDescription>
                            <DialogTitle className="flex items-center gap-2">
                              <Settings className="h-5 w-5 text-primary" />
                              تعديل: {user.name}
                            </DialogTitle>
                          </DialogHeader>
                          {editUser?.id === user.id && (
                            <EditUserForm user={editUser} onSuccess={() => { setEditUser(null); usersQuery.refetch(); }} />
                          )}
                        </DialogContent>
                      </Dialog>

                      {/* Permissions */}
                      <Dialog open={permUser?.id === user.id} onOpenChange={(open) => !open && setPermUser(null)}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setPermUser(user)} className="gap-1">
                            <Shield className="h-3.5 w-3.5" />
                            صلاحيات
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl" dir="rtl">
                          <DialogHeader>
                            <DialogDescription className="sr-only">تفاصيل النافذة.</DialogDescription>
                            <DialogTitle className="flex items-center gap-2">
                              <Key className="h-5 w-5 text-primary" />
                              صلاحيات: {user.name}
                            </DialogTitle>
                          </DialogHeader>
                          {permUser?.id === user.id && (
                            <PermissionsEditor
                              userId={user.id}
                              userName={user.name}
                              onClose={() => setPermUser(null)}
                            />
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  {/* Last Login */}
                  {user.lastLoginAt && (
                    <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                      <RefreshCw className="h-3 w-3" />
                      آخر دخول: {new Date(user.lastLoginAt).toLocaleString("ar-SA")}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Activity Logs Tab */}
        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                سجل النشاط
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityLogsView />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
