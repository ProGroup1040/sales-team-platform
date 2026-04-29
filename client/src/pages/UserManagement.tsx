import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocalAuth } from "@/hooks/useLocalAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Users, UserPlus, Shield, Key, Eye, EyeOff, Settings,
  CheckCircle, XCircle, Activity, Lock, Unlock, Edit, RefreshCw
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

// ─── Create User Form ─────────────────────────────────────────────────────────
function CreateUserForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({ name: "", username: "", password: "", role: "sales_engineer" as Role, engineerId: "" });
  const [showPassword, setShowPassword] = useState(false);

  const engineersQuery = trpc.engineers.list.useQuery(undefined, { staleTime: 60000, enabled: true });
  const createMut = trpc.appUsers.create.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء المستخدم بنجاح");
      setForm({ name: "", username: "", password: "", role: "sales_engineer", engineerId: "" });
      onSuccess();
    },
    onError: (e) => toast.error(e.message || "حدث خطأ أثناء إنشاء المستخدم"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.username || !form.password) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    createMut.mutate({
      name: form.name,
      username: form.username,
      password: form.password,
      role: form.role,
      engineerId: form.engineerId ? parseInt(form.engineerId) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>الاسم الكامل *</Label>
          <Input
            placeholder="أحمد محمد"
            value={form.name}
            onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>اسم المستخدم *</Label>
          <Input
            placeholder="ahmed.m"
            value={form.username}
            onChange={(e) => setForm(p => ({ ...p, username: e.target.value }))}
            dir="ltr"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>كلمة المرور *</Label>
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="6 أحرف على الأقل"
            value={form.password}
            onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
            dir="ltr"
            className="pl-10"
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>الدور *</Label>
          <Select value={form.role} onValueChange={(v) => setForm(p => ({ ...p, role: v as Role }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(ROLE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>ربط بمهندس (اختياري)</Label>
          <Select value={form.engineerId} onValueChange={(v) => setForm(p => ({ ...p, engineerId: v }))}>
            <SelectTrigger><SelectValue placeholder="اختر مهندس" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">بدون ربط</SelectItem>
              {engineersQuery.data?.map((eng: any) => (
                <SelectItem key={eng.id} value={String(eng.id)}>{eng.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={createMut.isPending}>
        {createMut.isPending ? "جاري الإنشاء..." : "إنشاء المستخدم"}
      </Button>
    </form>
  );
}

// ─── Permissions Editor ───────────────────────────────────────────────────────
function PermissionsEditor({ userId, userName, onClose }: { userId: number; userName: string; onClose: () => void }) {
  const permsQuery = trpc.appUsers.getPermissions.useQuery({ userId });
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
    setPerms(p => ({
      ...p,
      [module]: { ...p[module], [key]: p[module]?.[key] ? 0 : 1 }
    }));
  };

  const toggleScope = (module: string) => {
    setPerms(p => ({
      ...p,
      [module]: { ...p[module], dataScope: p[module]?.dataScope === "all" ? "own" : "all" }
    }));
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

  if (permsQuery.isLoading) return <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>;

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        تعديل صلاحيات: <span className="text-foreground font-medium">{userName}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-right py-2 px-3 font-medium text-muted-foreground">الوحدة</th>
              <th className="text-center py-2 px-3 font-medium text-muted-foreground">عرض</th>
              <th className="text-center py-2 px-3 font-medium text-muted-foreground">إضافة</th>
              <th className="text-center py-2 px-3 font-medium text-muted-foreground">تعديل</th>
              <th className="text-center py-2 px-3 font-medium text-muted-foreground">حذف</th>
              <th className="text-center py-2 px-3 font-medium text-muted-foreground">النطاق</th>
            </tr>
          </thead>
          <tbody>
            {MODULES.map(mod => {
              const p = perms[mod] ?? { canView: 0, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" as const };
              return (
                <tr key={mod} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-2 px-3 font-medium">{MODULE_LABELS[mod]}</td>
                  {(["canView", "canAdd", "canEdit", "canDelete"] as const).map(key => (
                    <td key={key} className="text-center py-2 px-3">
                      <button onClick={() => togglePerm(mod, key)} className="mx-auto block">
                        {p[key] ? (
                          <CheckCircle className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground/40" />
                        )}
                      </button>
                    </td>
                  ))}
                  <td className="text-center py-2 px-3">
                    <button
                      onClick={() => toggleScope(mod)}
                      className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                        p.dataScope === "all"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {p.dataScope === "all" ? "الكل" : "بياناته"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 pt-2">
        <Button onClick={handleSave} disabled={updateMut.isPending} className="flex-1">
          {updateMut.isPending ? "جاري الحفظ..." : "حفظ الصلاحيات"}
        </Button>
        <Button variant="outline" onClick={onClose}>إلغاء</Button>
      </div>
    </div>
  );
}

// ─── Edit User Form ───────────────────────────────────────────────────────────
function EditUserForm({ user, onSuccess }: { user: any; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: user.name,
    role: user.role as Role,
    status: user.status,
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const updateMut = trpc.appUsers.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث المستخدم");
      onSuccess();
    },
    onError: (e) => toast.error(e.message || "حدث خطأ"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMut.mutate({
      userId: user.id,
      name: form.name,
      role: form.role,
      status: form.status,
      ...(form.password ? { password: form.password } : {}),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>الاسم الكامل</Label>
        <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label>الدور</Label>
        <Select value={form.role} onValueChange={(v) => setForm(p => ({ ...p, role: v as Role }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(ROLE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-3">
        <Label>الحالة</Label>
        <Switch
          checked={form.status === "active"}
          onCheckedChange={(v) => setForm(p => ({ ...p, status: v ? "active" : "inactive" }))}
        />
        <span className="text-sm text-muted-foreground">{form.status === "active" ? "نشط" : "موقوف"}</span>
      </div>
      <div className="space-y-2">
        <Label>كلمة مرور جديدة (اتركها فارغة للإبقاء على الحالية)</Label>
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="كلمة مرور جديدة..."
            value={form.password}
            onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
            dir="ltr"
            className="pl-10"
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={updateMut.isPending}>
        {updateMut.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
      </Button>
    </form>
  );
}

// ─── Activity Logs ────────────────────────────────────────────────────────────
function ActivityLogsView() {
  const logsQuery = trpc.appUsers.activityLogs.useQuery({ limit: 50 });

  const ACTION_LABELS: Record<string, string> = {
    login: "تسجيل دخول",
    logout: "تسجيل خروج",
    create: "إنشاء",
    update: "تحديث",
    delete: "حذف",
    view: "عرض",
    export: "تصدير",
    permission_change: "تغيير صلاحيات",
  };

  const ACTION_COLORS: Record<string, string> = {
    login: "text-emerald-400",
    logout: "text-orange-400",
    create: "text-blue-400",
    update: "text-yellow-400",
    delete: "text-red-400",
    permission_change: "text-purple-400",
  };

  if (logsQuery.isLoading) return <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>;

  return (
    <div className="space-y-2">
      {logsQuery.data?.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">لا توجد سجلات نشاط</div>
      )}
      {logsQuery.data?.map((log: any) => (
        <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
          <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-medium ${ACTION_COLORS[log.action] || "text-foreground"}`}>
                {ACTION_LABELS[log.action] || log.action}
              </span>
              {log.module && (
                <Badge variant="outline" className="text-xs">{log.module}</Badge>
              )}
              {log.details && (
                <span className="text-xs text-muted-foreground truncate">{log.details}</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {new Date(log.createdAt).toLocaleString("ar-SA")}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UserManagement() {
  const { session } = useLocalAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [permUser, setPermUser] = useState<any>(null);

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

  // فقط المدير يمكنه الوصول لهذه الصفحة
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

  return (
    <div className="space-y-6 p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
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
              مستخدم جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                إنشاء مستخدم جديد
              </DialogTitle>
            </DialogHeader>
            <CreateUserForm onSuccess={() => { setCreateOpen(false); usersQuery.refetch(); }} />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            المستخدمون
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Activity className="h-4 w-4" />
            سجل النشاط
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4 mt-4">
          {usersQuery.isLoading && (
            <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
          )}
          {usersQuery.data?.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">لا يوجد مستخدمون بعد</p>
                <p className="text-xs text-muted-foreground mt-1">أنشئ أول مستخدم بالضغط على "مستخدم جديد"</p>
              </CardContent>
            </Card>
          )}
          <div className="grid gap-3">
            {usersQuery.data?.map((user: any) => (
              <Card key={user.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    {/* User Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-primary">
                          {user.name?.charAt(0) || "U"}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{user.name}</div>
                        <div className="text-xs text-muted-foreground" dir="ltr">@{user.username}</div>
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
