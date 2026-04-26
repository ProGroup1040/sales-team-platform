import { useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type DateRangeType = "today" | "yesterday" | "week" | "month" | "custom";

export interface TimeFilterValue {
  dateRange: DateRangeType;
  dateFrom?: string;
  dateTo?: string;
}

interface TimeFilterBarProps {
  value: TimeFilterValue;
  onChange: (v: TimeFilterValue) => void;
  className?: string;
}

const PRESETS: { key: DateRangeType; label: string }[] = [
  { key: "today",     label: "اليوم" },
  { key: "yesterday", label: "أمس" },
  { key: "week",      label: "هذا الأسبوع" },
  { key: "month",     label: "هذا الشهر" },
  { key: "custom",    label: "تاريخ مخصص" },
];

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function TimeFilterBar({ value, onChange, className = "" }: TimeFilterBarProps) {
  const [customOpen, setCustomOpen] = useState(false);
  const [tempFrom, setTempFrom] = useState(value.dateFrom ?? todayStr());
  const [tempTo,   setTempTo]   = useState(value.dateTo   ?? todayStr());

  const handlePreset = (key: DateRangeType) => {
    if (key === "custom") {
      setCustomOpen(true);
      return;
    }
    onChange({ dateRange: key });
  };

  const applyCustom = () => {
    onChange({ dateRange: "custom", dateFrom: tempFrom, dateTo: tempTo });
    setCustomOpen(false);
  };

  const getLabel = () => {
    if (value.dateRange === "custom" && value.dateFrom && value.dateTo) {
      return `${value.dateFrom} → ${value.dateTo}`;
    }
    return PRESETS.find(p => p.key === value.dateRange)?.label ?? "اليوم";
  };

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`} dir="rtl">
      {/* Quick presets */}
      <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/10 flex-wrap">
        {PRESETS.filter(p => p.key !== "custom").map(preset => (
          <button
            key={preset.key}
            onClick={() => handlePreset(preset.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              value.dateRange === preset.key
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-white/60 hover:text-white hover:bg-white/10"
            }`}
          >
            {preset.label}
          </button>
        ))}

        {/* Custom date range */}
        <Popover open={customOpen} onOpenChange={setCustomOpen}>
          <PopoverTrigger asChild>
            <button
              onClick={() => setCustomOpen(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                value.dateRange === "custom"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              <Calendar className="h-3 w-3" />
              {value.dateRange === "custom" ? getLabel() : "تاريخ مخصص"}
              <ChevronDown className="h-3 w-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="bg-slate-900 border-white/10 text-white w-72 p-4" align="end">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-white/80">اختر نطاق تاريخ مخصص</p>
              <div className="space-y-2">
                <Label className="text-white/60 text-xs">من</Label>
                <Input
                  type="date"
                  value={tempFrom}
                  onChange={e => setTempFrom(e.target.value)}
                  className="bg-white/5 border-white/10 text-white text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/60 text-xs">إلى</Label>
                <Input
                  type="date"
                  value={tempTo}
                  onChange={e => setTempTo(e.target.value)}
                  className="bg-white/5 border-white/10 text-white text-sm"
                />
              </div>
              <Button
                size="sm"
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                onClick={applyCustom}
                disabled={!tempFrom || !tempTo || tempFrom > tempTo}
              >
                تطبيق
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
