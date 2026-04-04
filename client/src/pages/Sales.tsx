import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Search, Plus, Eye, Trash2, Loader2, ShoppingCart, Filter, ChevronLeft, ChevronRight } from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  pending: { label: 'معلق', class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  confirmed: { label: 'مؤكد', class: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  shipped: { label: 'مشحون', class: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  delivered: { label: 'مسلّم', class: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  cancelled: { label: 'ملغي', class: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
};

const PAYMENT_LABELS: Record<string, { label: string; class: string }> = {
  paid: { label: 'مدفوع', class: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  partial: { label: 'جزئي', class: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  unpaid: { label: 'غير مدفوع', class: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
};

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(Number(value));
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function Sales() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [page, setPage] = useState(0);
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showNewSale, setShowNewSale] = useState(false);
  const [updateStatusId, setUpdateStatusId] = useState<number | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [newPaymentStatus, setNewPaymentStatus] = useState('');

  const limit = 15;

  const { data, isLoading } = trpc.sales.list.useQuery({
    search: search || undefined,
    status: status !== 'all' ? status : undefined,
    paymentStatus: paymentStatus !== 'all' ? paymentStatus : undefined,
    limit,
    offset: page * limit,
  });

  const { data: saleDetail, isLoading: detailLoading } = trpc.sales.byId.useQuery(
    { id: selectedSaleId! },
    { enabled: !!selectedSaleId }
  );

  const deleteMutation = trpc.sales.delete.useMutation({
    onSuccess: () => { toast.success('تم حذف الطلب بنجاح'); utils.sales.list.invalidate(); setDeleteId(null); },
    onError: (err) => toast.error(`خطأ: ${err.message}`),
  });

  const updateStatusMutation = trpc.sales.updateStatus.useMutation({
    onSuccess: () => {
      toast.success('تم تحديث الحالة بنجاح');
      utils.sales.list.invalidate();
      utils.sales.byId.invalidate({ id: updateStatusId! });
      setUpdateStatusId(null);
    },
    onError: (err) => toast.error(`خطأ: ${err.message}`),
  });

  const totalPages = Math.ceil((data?.total ?? 0) / limit);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة المبيعات</h1>
          <p className="text-muted-foreground text-sm mt-1">
            إجمالي {data?.total ?? 0} عملية بيع
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="shadow-sm border border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث برقم الفاتورة..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pr-9"
              />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="حالة الطلب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="pending">معلق</SelectItem>
                <SelectItem value="confirmed">مؤكد</SelectItem>
                <SelectItem value="shipped">مشحون</SelectItem>
                <SelectItem value="delivered">مسلّم</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentStatus} onValueChange={(v) => { setPaymentStatus(v); setPage(0); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="حالة الدفع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الدفعات</SelectItem>
                <SelectItem value="paid">مدفوع</SelectItem>
                <SelectItem value="partial">جزئي</SelectItem>
                <SelectItem value="unpaid">غير مدفوع</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-sm border border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-right p-4 font-semibold text-muted-foreground">رقم الفاتورة</th>
                    <th className="text-right p-4 font-semibold text-muted-foreground">العميل</th>
                    <th className="text-right p-4 font-semibold text-muted-foreground">التاريخ</th>
                    <th className="text-right p-4 font-semibold text-muted-foreground">المبلغ</th>
                    <th className="text-right p-4 font-semibold text-muted-foreground">حالة الطلب</th>
                    <th className="text-right p-4 font-semibold text-muted-foreground">حالة الدفع</th>
                    <th className="text-right p-4 font-semibold text-muted-foreground">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.data ?? []).map((sale) => (
                    <tr key={sale.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="p-4 font-mono font-medium text-primary">{sale.invoiceNumber}</td>
                      <td className="p-4 font-medium">{sale.customerName ?? '-'}</td>
                      <td className="p-4 text-muted-foreground">{formatDate(sale.saleDate)}</td>
                      <td className="p-4 font-semibold">{formatCurrency(sale.netAmount)}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_LABELS[sale.status]?.class}`}>
                          {STATUS_LABELS[sale.status]?.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PAYMENT_LABELS[sale.paymentStatus]?.class}`}>
                          {PAYMENT_LABELS[sale.paymentStatus]?.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => setSelectedSaleId(sale.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => {
                              setUpdateStatusId(sale.id);
                              setNewStatus(sale.status);
                              setNewPaymentStatus(sale.paymentStatus);
                            }}
                            className="h-8 px-2 text-xs"
                          >
                            تحديث
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => setDeleteId(sale.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(data?.data ?? []).length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-muted-foreground">
                        <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>لا توجد بيانات مبيعات</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              صفحة {page + 1} من {totalPages}
            </p>
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
      </Card>

      {/* Sale Detail Dialog */}
      <Dialog open={!!selectedSaleId} onOpenChange={(open) => !open && setSelectedSaleId(null)}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>تفاصيل الفاتورة</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : saleDetail ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">رقم الفاتورة: </span><span className="font-mono font-bold text-primary">{saleDetail.invoiceNumber}</span></div>
                <div><span className="text-muted-foreground">العميل: </span><span className="font-medium">{saleDetail.customerName}</span></div>
                <div><span className="text-muted-foreground">التاريخ: </span><span>{formatDate(saleDetail.saleDate)}</span></div>
                <div><span className="text-muted-foreground">الحالة: </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_LABELS[saleDetail.status]?.class}`}>
                    {STATUS_LABELS[saleDetail.status]?.label}
                  </span>
                </div>
              </div>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="text-right p-3 font-semibold">المنتج</th>
                      <th className="text-right p-3 font-semibold">الكمية</th>
                      <th className="text-right p-3 font-semibold">السعر</th>
                      <th className="text-right p-3 font-semibold">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(saleDetail.items ?? []).map(item => (
                      <tr key={item.id} className="border-t border-border/50">
                        <td className="p-3">{item.productName}</td>
                        <td className="p-3">{item.quantity}</td>
                        <td className="p-3">{formatCurrency(item.unitPrice)}</td>
                        <td className="p-3 font-medium">{formatCurrency(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">المجموع:</span><span>{formatCurrency(saleDetail.totalAmount)}</span></div>
                {parseFloat(saleDetail.discount ?? '0') > 0 && <div className="flex justify-between text-green-600"><span>الخصم:</span><span>- {formatCurrency(saleDetail.discount ?? '0')}</span></div>}
                {parseFloat(saleDetail.tax ?? '0') > 0 && <div className="flex justify-between"><span className="text-muted-foreground">الضريبة (15%):</span><span>{formatCurrency(saleDetail.tax ?? '0')}</span></div>}
                <div className="flex justify-between font-bold text-base border-t border-border pt-2"><span>الصافي:</span><span className="text-primary">{formatCurrency(saleDetail.netAmount)}</span></div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={!!updateStatusId} onOpenChange={(open) => !open && setUpdateStatusId(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تحديث حالة الطلب</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">حالة الطلب</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">معلق</SelectItem>
                  <SelectItem value="confirmed">مؤكد</SelectItem>
                  <SelectItem value="shipped">مشحون</SelectItem>
                  <SelectItem value="delivered">مسلّم</SelectItem>
                  <SelectItem value="cancelled">ملغي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">حالة الدفع</label>
              <Select value={newPaymentStatus} onValueChange={setNewPaymentStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">غير مدفوع</SelectItem>
                  <SelectItem value="partial">جزئي</SelectItem>
                  <SelectItem value="paid">مدفوع</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateStatusId(null)}>إلغاء</Button>
            <Button
              onClick={() => updateStatusMutation.mutate({ id: updateStatusId!, status: newStatus as any, paymentStatus: newPaymentStatus as any })}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
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
