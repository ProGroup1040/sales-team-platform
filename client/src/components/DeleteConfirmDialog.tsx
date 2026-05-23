import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";

export type DeleteReason = "data_entry_error" | "duplicate" | "client_cancelled" | "other";

const REASON_LABELS: Record<DeleteReason, string> = {
  data_entry_error: "خطأ إدخال",
  duplicate: "مكرر",
  client_cancelled: "إلغاء من العميل",
  other: "سبب آخر",
};

interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: DeleteReason, reasonCustom?: string) => void;
  title?: string;
  description?: string;
  isLoading?: boolean;
}

export function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "تأكيد الحذف",
  description = "هل أنت متأكد من حذف هذا العنصر؟ لن يظهر في القوائم لكنه سيبقى محفوظاً في قاعدة البيانات.",
  isLoading = false,
}: DeleteConfirmDialogProps) {
  const [reason, setReason] = useState<DeleteReason | "">("");
  const [reasonCustom, setReasonCustom] = useState("");

  const handleConfirm = () => {
    if (!reason) return;
    onConfirm(reason as DeleteReason, reason === "other" ? reasonCustom : undefined);
  };

  const handleClose = () => {
    setReason("");
    setReasonCustom("");
    onClose();
  };

  const isConfirmDisabled =
    isLoading ||
    !reason ||
    (reason === "other" && !reasonCustom.trim());

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>سبب الحذف *</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as DeleteReason)}>
              <SelectTrigger>
                <SelectValue placeholder="اختر سبب الحذف..." />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(REASON_LABELS) as [DeleteReason, string][]).map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {reason === "other" && (
            <div className="space-y-2">
              <Label>اكتب السبب *</Label>
              <Textarea
                value={reasonCustom}
                onChange={(e) => setReasonCustom(e.target.value)}
                placeholder="اكتب سبب الحذف..."
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 justify-end">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            إلغاء
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
          >
            {isLoading ? "جاري الحذف..." : "تأكيد الحذف"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
