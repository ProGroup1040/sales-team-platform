/**
 * Permission Control Panel
 * لوحة التحكم في الصلاحيات - Dynamic Matrix
 * 
 * الـ Admin يمكنه:
 * - تعديل صلاحيات كل Role على كل Module
 * - تحديد canView / canAdd / canEdit / canDelete
 * - تحديد dataScope (own / team / all)
 * - التغييرات تسري فوراً بدون إعادة تشغيل
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield, Eye, Plus, Edit3, Trash2, Database, Save, RefreshCw, CheckCircle2, XCircle, Info } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PermRow {
  id: number;
  role: string;
  module: string;
  canView: number;
  canAdd: number;
  canEdit: number;
  canDelete: number;
  dataScope: "own" | "team" | "all";
}

interface ModuleMeta { key: string; label: string }
interface RoleMeta   { key: string; label: string }

// ─── Permission Cell Component ────────────────────────────────────────────────
function PermCell({
  perm,
  onUpdate,
  saving,
}: {
  perm: PermRow | undefined;
  onUpdate: (field: keyof PermRow, value: number | string) => void;
  saving: boolean;
}) {
  if (!perm) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground/40">
        <XCircle className="h-4 w-4" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 p-1">
      {/* CRUD Toggles */}
      <div className="grid grid-cols-2 gap-1">
        {[
          { key: "canView",   icon: Eye,    label: "عرض",  color: "text-blue-400" },
          { key: "canAdd",    icon: Plus,   label: "إضافة", color: "text-green-400" },
          { key: "canEdit",   icon: Edit3,  label: "تعديل", color: "text-yellow-400" },
          { key: "canDelete", icon: Trash2, label: "حذف",  color: "text-red-400" },
        ].map(({ key, icon: Icon, label, color }) => (
          <button
            key={key}
            disabled={saving}
            onClick={() => onUpdate(key as keyof PermRow, perm[key as keyof PermRow] === 1 ? 0 : 1)}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium transition-all border ${
              perm[key as keyof PermRow] === 1
                ? `bg-primary/10 border-primary/30 ${color}`
                : "bg-muted/30 border-border/30 text-muted-foreground/40 hover:border-border"
            }`}
          >
            <Icon className="h-2.5 w-2.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>
      {/* Data Scope */}
      <Select
        value={perm.dataScope}
        onValueChange={(v) => onUpdate("dataScope", v)}
        disabled={saving || perm.canView === 0}
      >
        <SelectTrigger className="h-6 text-xs border-border/40 bg-muted/20">
          <Database className="h-2.5 w-2.5 mr-1" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="own">بياناته فقط</SelectItem>
          <SelectItem value="team">بيانات الفريق</SelectItem>
          <SelectItem value="all">كل البيانات</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PermissionsPanel() {
  const utils = trpc.useUtils();
  const [activeRole, setActiveRole] = useState<string>("manager");
  const [pendingChanges, setPendingChanges] = useState<Record<string, Partial<PermRow>>>({});
  const [saving, setSaving] = useState(false);

  // Fetch all permissions
  const { data, isLoading, error } = trpc.rolePermissions.getAll.useQuery(undefined, {
    retry: false,
    staleTime: 0,
  });

  // Update single permission mutation
  const updateMut = trpc.rolePermissions.update.useMutation({
    onSuccess: () => {
      utils.rolePermissions.getAll.invalidate();
    },
    onError: (err) => {
      toast.error("فشل التحديث: " + err.message);
    },
  });

  // Build permission map: role+module → perm
  const permMap = useMemo(() => {
    const map: Record<string, PermRow> = {};
    if (data?.permissions) {
      for (const p of data.permissions) {
        map[`${p.role}::${p.module}`] = p as PermRow;
      }
    }
    return map;
  }, [data]);

  // Merge pending changes into permMap
  const effectivePermMap = useMemo(() => {
    const merged = { ...permMap };
    for (const [key, changes] of Object.entries(pendingChanges)) {
      if (merged[key]) {
        merged[key] = { ...merged[key], ...changes };
      }
    }
    return merged;
  }, [permMap, pendingChanges]);

  const modules: ModuleMeta[] = (data?.modules as any) ?? [];
  const roles: RoleMeta[]     = (data?.roles as any) ?? [];

  // Handle cell update (optimistic, pending save)
  function handleCellUpdate(role: string, module: string, field: keyof PermRow, value: number | string) {
    const key = `${role}::${module}`;
    setPendingChanges(prev => ({
      ...prev,
      [key]: { ...(prev[key] ?? {}), [field]: value },
    }));
  }

  // Save all pending changes
  async function saveAllChanges() {
    if (Object.keys(pendingChanges).length === 0) {
      toast.info("لا توجد تغييرات للحفظ");
      return;
    }
    setSaving(true);
    let successCount = 0;
    let errorCount = 0;
    for (const [key, changes] of Object.entries(pendingChanges)) {
      const [role, module] = key.split("::");
      const base = permMap[key];
      if (!base) continue;
      try {
        await updateMut.mutateAsync({
          role,
          module,
          canView:   changes.canView   ?? base.canView,
          canAdd:    changes.canAdd    ?? base.canAdd,
          canEdit:   changes.canEdit   ?? base.canEdit,
          canDelete: changes.canDelete ?? base.canDelete,
          dataScope: (changes.dataScope ?? base.dataScope) as "own" | "team" | "all",
        });
        successCount++;
      } catch {
        errorCount++;
      }
    }
    setSaving(false);
    setPendingChanges({});
    if (errorCount === 0) {
      toast.success(`✅ تم حفظ ${successCount} تغيير بنجاح`);
    } else {
      toast.warning(`تم حفظ ${successCount} وفشل ${errorCount}`);
    }
    utils.rolePermissions.getAll.invalidate();
  }

  // Discard pending changes
  function discardChanges() {
    setPendingChanges({});
    toast.info("تم إلغاء التغييرات");
  }

  // Quick actions: Grant All / Revoke All for a role
  async function grantAllForRole(role: string) {
    const newChanges: Record<string, Partial<PermRow>> = { ...pendingChanges };
    for (const mod of modules) {
      const key = `${role}::${mod.key}`;
      newChanges[key] = { canView: 1, canAdd: 1, canEdit: 1, canDelete: 1, dataScope: "all" };
    }
    setPendingChanges(newChanges);
    toast.info(`تم تفعيل كل الصلاحيات لـ ${roles.find(r => r.key === role)?.label ?? role} (لم يُحفظ بعد)`);
  }

  async function revokeAllForRole(role: string) {
    const newChanges: Record<string, Partial<PermRow>> = { ...pendingChanges };
    for (const mod of modules) {
      const key = `${role}::${mod.key}`;
      newChanges[key] = { canView: 0, canAdd: 0, canEdit: 0, canDelete: 0, dataScope: "own" };
    }
    setPendingChanges(newChanges);
    toast.info(`تم إلغاء كل الصلاحيات لـ ${roles.find(r => r.key === role)?.label ?? role} (لم يُحفظ بعد)`);
  }

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-destructive gap-2">
        <XCircle className="h-5 w-5" />
        <span>خطأ في تحميل الصلاحيات: {error.message}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            لوحة التحكم في الصلاحيات
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            تحكم كامل في صلاحيات كل Role على كل Module — التغييرات تسري فوراً بعد الحفظ
          </p>
        </div>
        {/* Save / Discard */}
        <div className="flex items-center gap-2">
          {hasPendingChanges && (
            <Badge variant="outline" className="text-yellow-400 border-yellow-400/30 bg-yellow-400/10">
              {Object.keys(pendingChanges).length} تغيير غير محفوظ
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={discardChanges}
            disabled={!hasPendingChanges || saving}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            إلغاء
          </Button>
          <Button
            size="sm"
            onClick={saveAllChanges}
            disabled={!hasPendingChanges || saving}
            className="gap-1"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="py-3 px-4">
          <div className="flex items-start gap-2 text-sm text-blue-300">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <strong>كيفية الاستخدام:</strong> اختر الـ Role من التابات أدناه، ثم فعّل أو أوقف الصلاحيات لكل Module.
              يمكنك تحديد مستوى الوصول للبيانات (بياناته فقط / بيانات الفريق / كل البيانات).
              اضغط <strong>حفظ التغييرات</strong> لتطبيق التعديلات.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs per Role */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>جاري تحميل الصلاحيات...</span>
        </div>
      ) : (
        <Tabs value={activeRole} onValueChange={setActiveRole}>
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            {roles.map(role => {
              const roleChanges = Object.keys(pendingChanges).filter(k => k.startsWith(`${role.key}::`)).length;
              return (
                <TabsTrigger key={role.key} value={role.key} className="gap-1.5">
                  {role.label}
                  {roleChanges > 0 && (
                    <Badge className="h-4 text-[10px] px-1 bg-yellow-500/20 text-yellow-400 border-yellow-400/30">
                      {roleChanges}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {roles.map(role => (
            <TabsContent key={role.key} value={role.key}>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{role.label}</CardTitle>
                      <CardDescription>
                        تحديد صلاحيات كل Module لهذا الـ Role
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-400 border-green-400/30 hover:bg-green-400/10 text-xs"
                        onClick={() => grantAllForRole(role.key)}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        تفعيل الكل
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-400 border-red-400/30 hover:bg-red-400/10 text-xs"
                        onClick={() => revokeAllForRole(role.key)}
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        إلغاء الكل
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Permission Matrix Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-border/40">
                          <th className="text-right py-2 px-3 font-semibold text-muted-foreground w-40">القسم</th>
                          <th className="text-center py-2 px-2 font-semibold text-blue-400 w-10">
                            <div className="flex flex-col items-center gap-0.5">
                              <Eye className="h-3.5 w-3.5" />
                              <span className="text-[10px]">عرض</span>
                            </div>
                          </th>
                          <th className="text-center py-2 px-2 font-semibold text-green-400 w-10">
                            <div className="flex flex-col items-center gap-0.5">
                              <Plus className="h-3.5 w-3.5" />
                              <span className="text-[10px]">إضافة</span>
                            </div>
                          </th>
                          <th className="text-center py-2 px-2 font-semibold text-yellow-400 w-10">
                            <div className="flex flex-col items-center gap-0.5">
                              <Edit3 className="h-3.5 w-3.5" />
                              <span className="text-[10px]">تعديل</span>
                            </div>
                          </th>
                          <th className="text-center py-2 px-2 font-semibold text-red-400 w-10">
                            <div className="flex flex-col items-center gap-0.5">
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="text-[10px]">حذف</span>
                            </div>
                          </th>
                          <th className="text-center py-2 px-3 font-semibold text-muted-foreground w-36">
                            <div className="flex flex-col items-center gap-0.5">
                              <Database className="h-3.5 w-3.5" />
                              <span className="text-[10px]">نطاق البيانات</span>
                            </div>
                          </th>
                          <th className="text-center py-2 px-2 font-semibold text-muted-foreground w-20">الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modules.map((mod, idx) => {
                          const key = `${role.key}::${mod.key}`;
                          const perm = effectivePermMap[key];
                          const isPending = !!pendingChanges[key];
                          const isHidden = perm?.canView === 0;

                          return (
                            <tr
                              key={mod.key}
                              className={`border-b border-border/20 transition-colors ${
                                idx % 2 === 0 ? "bg-muted/5" : ""
                              } ${isPending ? "bg-yellow-500/5 border-yellow-500/20" : ""}`}
                            >
                              {/* Module Name */}
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-2">
                                  <span className={`font-medium ${isHidden ? "text-muted-foreground/50" : "text-foreground"}`}>
                                    {mod.label}
                                  </span>
                                  {isPending && (
                                    <Badge className="h-3.5 text-[9px] px-1 bg-yellow-500/20 text-yellow-400 border-yellow-400/30">
                                      معدّل
                                    </Badge>
                                  )}
                                </div>
                              </td>

                              {/* canView */}
                              <td className="py-2 px-2 text-center">
                                <Switch
                                  checked={perm?.canView === 1}
                                  onCheckedChange={(v) => handleCellUpdate(role.key, mod.key, "canView", v ? 1 : 0)}
                                  className="scale-75"
                                />
                              </td>

                              {/* canAdd */}
                              <td className="py-2 px-2 text-center">
                                <Switch
                                  checked={perm?.canAdd === 1}
                                  disabled={perm?.canView === 0}
                                  onCheckedChange={(v) => handleCellUpdate(role.key, mod.key, "canAdd", v ? 1 : 0)}
                                  className="scale-75"
                                />
                              </td>

                              {/* canEdit */}
                              <td className="py-2 px-2 text-center">
                                <Switch
                                  checked={perm?.canEdit === 1}
                                  disabled={perm?.canView === 0}
                                  onCheckedChange={(v) => handleCellUpdate(role.key, mod.key, "canEdit", v ? 1 : 0)}
                                  className="scale-75"
                                />
                              </td>

                              {/* canDelete */}
                              <td className="py-2 px-2 text-center">
                                <Switch
                                  checked={perm?.canDelete === 1}
                                  disabled={perm?.canView === 0}
                                  onCheckedChange={(v) => handleCellUpdate(role.key, mod.key, "canDelete", v ? 1 : 0)}
                                  className="scale-75"
                                />
                              </td>

                              {/* dataScope */}
                              <td className="py-2 px-3">
                                <Select
                                  value={perm?.dataScope ?? "own"}
                                  onValueChange={(v) => handleCellUpdate(role.key, mod.key, "dataScope", v)}
                                  disabled={perm?.canView === 0}
                                >
                                  <SelectTrigger className="h-7 text-xs border-border/40 bg-muted/20">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="own">بياناته فقط</SelectItem>
                                    <SelectItem value="team">بيانات الفريق</SelectItem>
                                    <SelectItem value="all">كل البيانات</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>

                              {/* Status Badge */}
                              <td className="py-2 px-2 text-center">
                                {perm?.canView === 1 ? (
                                  <Badge className="text-[10px] px-1.5 bg-green-500/10 text-green-400 border-green-400/20">
                                    مفعّل
                                  </Badge>
                                ) : (
                                  <Badge className="text-[10px] px-1.5 bg-muted/20 text-muted-foreground/50 border-border/20">
                                    مخفي
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary */}
                  <div className="mt-4 pt-3 border-t border-border/20 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-400" />
                      {modules.filter(m => effectivePermMap[`${role.key}::${m.key}`]?.canView === 1).length} قسم مفعّل
                    </span>
                    <span className="flex items-center gap-1">
                      <XCircle className="h-3 w-3 text-muted-foreground/40" />
                      {modules.filter(m => !effectivePermMap[`${role.key}::${m.key}`] || effectivePermMap[`${role.key}::${m.key}`]?.canView === 0).length} قسم مخفي
                    </span>
                    {hasPendingChanges && (
                      <span className="flex items-center gap-1 text-yellow-400">
                        <Save className="h-3 w-3" />
                        يوجد تغييرات غير محفوظة — اضغط "حفظ التغييرات"
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
