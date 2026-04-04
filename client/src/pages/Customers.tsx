import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Search, Plus, Edit2, Trash2, Loader2, Users, ChevronLeft, ChevronRight, Building2, Phone, Mail, MapPin } from "lucide-react";

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(Number(value));
}

type CustomerForm = {
  name: string; email: string; phone: string;
  company: string; city: string; country: string;
  status: 'active' | 'inactive';
};

const defaultForm: CustomerForm = {
  name: '', email: '', phone: '', company: '', city: '', country: 'Saudi Arabia', status: 'active'
};

export default function Customers() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<CustomerForm>(defaultForm);

  const limit = 12;

  const { data, isLoading } = trpc.customers.list.useQuery({
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    limit,
    offset: page * limit,
  });

  const createMutation = trpc.customers.create.useMutation({
    onSuccess: () => { toast.success('تم إضافة العميل بنجاح'); utils.customers.list.invalidate(); closeForm(); },
    onError: (err) => toast.error(`خطأ: ${err.message}`),
  });

  const updateMutation = trpc.customers.update.useMutation({
    onSuccess: () => { toast.success('تم تحديث بيانات العميل'); utils.customers.list.invalidate(); closeForm(); },
    onError: (err) => toast.error(`خطأ: ${err.message}`),
  });

  const deleteMutation = trpc.customers.delete.useMutation({
    onSuccess: () => { toast.success('تم حذف العميل'); utils.customers.list.invalidate(); setDeleteId(null); },
    onError: (err) => toast.error(`خطأ: ${err.message}`),
  });

  function openCreate() { setForm(defaultForm); setEditId(null); setShowForm(true); }
  function openEdit(customer: any) {
    setForm({
      name: customer.name, email: customer.email ?? '', phone: customer.phone ?? '',
      company: customer.company ?? '', city: customer.city ?? '',
      country: customer.country ?? 'Saudi Arabia', status: customer.status,
    });
    setEditId(customer.id);
    setShowForm(true);
  }
  function closeForm() { setShowForm(false); setEditId(null); setForm(defaultForm); }

  function handleSubmit() {
    if (!form.name.trim()) { toast.error('اسم العميل مطلوب'); return; }
    if (editId) {
      updateMutation.mutate({ id: editId, ...form });
    } else {
      createMutation.mutate(form);
    }
  }

  const totalPages = Math.ceil((data?.total ?? 0) / limit);
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة العملاء</h1>
          <p className="text-muted-foreground text-sm mt-1">إجمالي {data?.total ?? 0} عميل</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          إضافة عميل
        </Button>
      </div>

      {/* Filters */}
      <Card className="shadow-sm border border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو البريد أو الشركة..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pr-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع العملاء</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="inactive">غير نشط</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Customers Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {(data?.data ?? []).map((customer) => (
              <Card key={customer.id} className="shadow-sm border border-border/50 hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{customer.name}</h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          customer.status === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {customer.status === 'active' ? 'نشط' : 'غير نشط'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(customer)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteId(customer.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    {customer.company && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{customer.company}</span>
                      </div>
                    )}
                    {customer.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                    {customer.city && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span>{customer.city}</span>
                      </div>
                    )}
                  </div>
                  {parseFloat(customer.totalPurchases ?? '0') > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">إجمالي المشتريات</span>
                        <span className="text-sm font-bold text-primary">{formatCurrency(customer.totalPurchases ?? '0')}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {(data?.data ?? []).length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>لا يوجد عملاء</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">صفحة {page + 1} من {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Customer Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editId ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>الاسم *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="اسم العميل" />
              </div>
              <div className="space-y-1.5">
                <Label>البريد الإلكتروني</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label>رقم الهاتف</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+966..." />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>الشركة</Label>
                <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="اسم الشركة" />
              </div>
              <div className="space-y-1.5">
                <Label>المدينة</Label>
                <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="المدينة" />
              </div>
              <div className="space-y-1.5">
                <Label>الحالة</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="inactive">غير نشط</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>إلغاء</Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              {editId ? 'حفظ التغييرات' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذا العميل؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate({ id: deleteId! })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
