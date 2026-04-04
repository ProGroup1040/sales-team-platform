import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Search, Plus, Edit2, Trash2, Loader2, Package, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(Number(value));
}

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  active: { label: 'نشط', class: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  inactive: { label: 'غير نشط', class: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  out_of_stock: { label: 'نفد المخزون', class: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
};

type ProductForm = {
  name: string; sku: string; category: string; price: string; cost: string;
  stock: number; minStock: number; unit: string; description: string;
  status: 'active' | 'inactive' | 'out_of_stock';
};

const defaultForm: ProductForm = {
  name: '', sku: '', category: '', price: '', cost: '',
  stock: 0, minStock: 10, unit: 'قطعة', description: '', status: 'active'
};

export default function Products() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(defaultForm);

  const limit = 12;

  const { data, isLoading } = trpc.products.list.useQuery({
    search: search || undefined,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    limit,
    offset: page * limit,
  });

  const { data: categories } = trpc.products.categories.useQuery();

  const createMutation = trpc.products.create.useMutation({
    onSuccess: () => { toast.success('تم إضافة المنتج بنجاح'); utils.products.list.invalidate(); utils.products.categories.invalidate(); closeForm(); },
    onError: (err) => toast.error(`خطأ: ${err.message}`),
  });

  const updateMutation = trpc.products.update.useMutation({
    onSuccess: () => { toast.success('تم تحديث المنتج'); utils.products.list.invalidate(); closeForm(); },
    onError: (err) => toast.error(`خطأ: ${err.message}`),
  });

  const deleteMutation = trpc.products.delete.useMutation({
    onSuccess: () => { toast.success('تم حذف المنتج'); utils.products.list.invalidate(); setDeleteId(null); },
    onError: (err) => toast.error(`خطأ: ${err.message}`),
  });

  function openCreate() { setForm(defaultForm); setEditId(null); setShowForm(true); }
  function openEdit(product: any) {
    setForm({
      name: product.name, sku: product.sku ?? '', category: product.category ?? '',
      price: product.price, cost: product.cost ?? '', stock: product.stock,
      minStock: product.minStock ?? 10, unit: product.unit ?? 'قطعة',
      description: product.description ?? '', status: product.status,
    });
    setEditId(product.id);
    setShowForm(true);
  }
  function closeForm() { setShowForm(false); setEditId(null); setForm(defaultForm); }

  function handleSubmit() {
    if (!form.name.trim()) { toast.error('اسم المنتج مطلوب'); return; }
    if (!form.price || isNaN(Number(form.price))) { toast.error('السعر غير صحيح'); return; }
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
          <h1 className="text-2xl font-bold">إدارة المنتجات</h1>
          <p className="text-muted-foreground text-sm mt-1">إجمالي {data?.total ?? 0} منتج</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          إضافة منتج
        </Button>
      </div>

      {/* Filters */}
      <Card className="shadow-sm border border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو الكود..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pr-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="الفئة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الفئات</SelectItem>
                {(categories ?? []).map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="inactive">غير نشط</SelectItem>
                <SelectItem value="out_of_stock">نفد المخزون</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {(data?.data ?? []).map((product) => {
              const isLowStock = product.stock <= (product.minStock ?? 10) && product.stock > 0;
              const isOutOfStock = product.stock === 0;
              return (
                <Card key={product.id} className={`shadow-sm border transition-shadow hover:shadow-md ${isOutOfStock ? 'border-red-200 dark:border-red-900/50' : isLowStock ? 'border-amber-200 dark:border-amber-900/50' : 'border-border/50'}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Package className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm leading-tight">{product.name}</h3>
                          {product.sku && <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(product)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteId(product.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {product.category && (
                        <span className="inline-block bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-md font-medium">
                          {product.category}
                        </span>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">السعر</span>
                        <span className="font-bold text-primary">{formatCurrency(product.price)}</span>
                      </div>
                      {product.cost && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">التكلفة</span>
                          <span className="text-sm">{formatCurrency(product.cost)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">المخزون</span>
                        <div className="flex items-center gap-1.5">
                          {(isLowStock || isOutOfStock) && (
                            <AlertTriangle className={`w-3.5 h-3.5 ${isOutOfStock ? 'text-red-500' : 'text-amber-500'}`} />
                          )}
                          <span className={`text-sm font-semibold ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-foreground'}`}>
                            {product.stock} {product.unit}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_LABELS[product.status]?.class}`}>
                        {STATUS_LABELS[product.status]?.label}
                      </span>
                      {product.cost && (
                        <span className="text-xs text-muted-foreground">
                          هامش: {(((parseFloat(product.price) - parseFloat(product.cost)) / parseFloat(product.price)) * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {(data?.data ?? []).length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>لا توجد منتجات</p>
              </div>
            )}
          </div>

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

      {/* Product Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editId ? 'تعديل المنتج' : 'إضافة منتج جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto pl-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>اسم المنتج *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="اسم المنتج" />
              </div>
              <div className="space-y-1.5">
                <Label>كود المنتج (SKU)</Label>
                <Input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="SKU-001" />
              </div>
              <div className="space-y-1.5">
                <Label>الفئة</Label>
                <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="الفئة" />
              </div>
              <div className="space-y-1.5">
                <Label>السعر *</Label>
                <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" min="0" step="0.01" />
              </div>
              <div className="space-y-1.5">
                <Label>التكلفة</Label>
                <Input type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} placeholder="0.00" min="0" step="0.01" />
              </div>
              <div className="space-y-1.5">
                <Label>المخزون</Label>
                <Input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: parseInt(e.target.value) || 0 }))} min="0" />
              </div>
              <div className="space-y-1.5">
                <Label>الحد الأدنى للمخزون</Label>
                <Input type="number" value={form.minStock} onChange={e => setForm(f => ({ ...f, minStock: parseInt(e.target.value) || 0 }))} min="0" />
              </div>
              <div className="space-y-1.5">
                <Label>الوحدة</Label>
                <Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="قطعة" />
              </div>
              <div className="space-y-1.5">
                <Label>الحالة</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="inactive">غير نشط</SelectItem>
                    <SelectItem value="out_of_stock">نفد المخزون</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>الوصف</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="وصف المنتج" rows={2} />
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
            <AlertDialogDescription>هل أنت متأكد من حذف هذا المنتج؟</AlertDialogDescription>
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
