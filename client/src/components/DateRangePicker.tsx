/**
 * DateRangePicker - Advanced Date Filter Component
 * مشابه لـ Meta Ads Business Manager
 * يدعم: Month/Year picker + Custom Date Range + Preset Ranges
 */
import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatLocalDate } from '@shared/dateUtils';

// ─── Types ────────────────────────────────────────────────────────────────────
export type DateRangeMode = 'month' | 'custom';

export interface MonthYearFilter {
  mode: 'month';
  month: number; // 1-12
  year: number;
}

export interface CustomRangeFilter {
  mode: 'custom';
  startDate: Date;
  endDate: Date;
  label?: string;
}

export type DateFilter = MonthYearFilter | CustomRangeFilter;

export interface DateRangePickerProps {
  value: DateFilter;
  onChange: (filter: DateFilter) => void;
  className?: string;
  showCustomRange?: boolean; // default: true
  minYear?: number;
  maxYear?: number;
}

// ─── Arabic Month Names ───────────────────────────────────────────────────────
const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

const ARABIC_DAYS_SHORT = ['أح', 'إث', 'ثل', 'أر', 'خم', 'جم', 'سب'];

// ─── Preset Ranges ────────────────────────────────────────────────────────────
function getPresetRanges(): Array<{ label: string; filter: DateFilter }> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const last7Start = new Date(today);
  last7Start.setDate(today.getDate() - 6);

  const last30Start = new Date(today);
  last30Start.setDate(today.getDate() - 29);

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  return [
    {
      label: 'اليوم',
      filter: { mode: 'custom', startDate: today, endDate: today, label: 'اليوم' },
    },
    {
      label: 'أمس',
      filter: { mode: 'custom', startDate: yesterday, endDate: yesterday, label: 'أمس' },
    },
    {
      label: 'آخر 7 أيام',
      filter: { mode: 'custom', startDate: last7Start, endDate: today, label: 'آخر 7 أيام' },
    },
    {
      label: 'آخر 30 يوم',
      filter: { mode: 'custom', startDate: last30Start, endDate: today, label: 'آخر 30 يوم' },
    },
    {
      label: 'هذا الشهر',
      filter: {
        mode: 'month',
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      },
    },
    {
      label: 'الشهر الماضي',
      filter: {
        mode: 'month',
        month: now.getMonth() === 0 ? 12 : now.getMonth(),
        year: now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(),
      },
    },
  ];
}

// ─── Calendar Grid ────────────────────────────────────────────────────────────
function CalendarGrid({
  year,
  month,
  selectedStart,
  selectedEnd,
  hoverDate,
  onDateClick,
  onDateHover,
}: {
  year: number;
  month: number; // 0-indexed
  selectedStart: Date | null;
  selectedEnd: Date | null;
  hoverDate: Date | null;
  onDateClick: (date: Date) => void;
  onDateHover: (date: Date | null) => void;
}) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay(); // 0=Sun
  const daysInMonth = lastDay.getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const effectiveEnd = selectedEnd ?? hoverDate;

  function isInRange(date: Date) {
    if (!selectedStart || !effectiveEnd) return false;
    const start = selectedStart <= effectiveEnd ? selectedStart : effectiveEnd;
    const end = selectedStart <= effectiveEnd ? effectiveEnd : selectedStart;
    return date >= start && date <= end;
  }

  function isStart(date: Date) {
    if (!selectedStart) return false;
    return date.toDateString() === selectedStart.toDateString();
  }

  function isEnd(date: Date) {
    if (!effectiveEnd) return false;
    return date.toDateString() === effectiveEnd.toDateString();
  }

  function isToday(date: Date) {
    return date.toDateString() === new Date().toDateString();
  }

  return (
    <div className="w-full">
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {ARABIC_DAYS_SHORT.map((d) => (
          <div key={d} className="text-center text-xs text-muted-foreground py-1 font-medium">
            {d}
          </div>
        ))}
      </div>
      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} />;
          const inRange = isInRange(date);
          const start = isStart(date);
          const end = isEnd(date);
          const today = isToday(date);
          return (
            <button
              key={date.toISOString()}
              onClick={() => onDateClick(date)}
              onMouseEnter={() => onDateHover(date)}
              onMouseLeave={() => onDateHover(null)}
              className={cn(
                'relative h-8 text-sm transition-colors',
                inRange && !start && !end && 'bg-primary/15',
                start && 'bg-primary text-primary-foreground rounded-r-full',
                end && 'bg-primary text-primary-foreground rounded-l-full',
                start && end && 'rounded-full',
                !start && !end && today && 'font-bold text-primary',
                !start && !end && !inRange && 'hover:bg-muted rounded-full',
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Month Picker ─────────────────────────────────────────────────────────────
function MonthPicker({
  value,
  onChange,
  minYear = 2020,
  maxYear = 2030,
}: {
  value: MonthYearFilter;
  onChange: (filter: MonthYearFilter) => void;
  minYear?: number;
  maxYear?: number;
}) {
  const [displayYear, setDisplayYear] = useState(value.year);

  return (
    <div className="p-4 w-64">
      {/* Year navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setDisplayYear((y) => Math.max(minYear, y - 1))}
          disabled={displayYear <= minYear}
          className="p-1 rounded hover:bg-muted disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <span className="font-semibold text-sm">{displayYear}</span>
        <button
          onClick={() => setDisplayYear((y) => Math.min(maxYear, y + 1))}
          disabled={displayYear >= maxYear}
          className="p-1 rounded hover:bg-muted disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
      {/* Month grid */}
      <div className="grid grid-cols-3 gap-2">
        {ARABIC_MONTHS.map((name, i) => {
          const isSelected = value.month === i + 1 && value.year === displayYear;
          const isCurrentMonth =
            new Date().getMonth() === i && new Date().getFullYear() === displayYear;
          return (
            <button
              key={name}
              onClick={() => onChange({ mode: 'month', month: i + 1, year: displayYear })}
              className={cn(
                'py-2 px-1 rounded text-sm transition-colors',
                isSelected
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : isCurrentMonth
                  ? 'border border-primary text-primary hover:bg-primary/10'
                  : 'hover:bg-muted',
              )}
            >
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Custom Range Picker ──────────────────────────────────────────────────────
function CustomRangePicker({
  value,
  onChange,
}: {
  value: CustomRangeFilter | null;
  onChange: (filter: CustomRangeFilter) => void;
}) {
  const now = new Date();
  const [leftMonth, setLeftMonth] = useState(now.getMonth());
  const [leftYear, setLeftYear] = useState(now.getFullYear());
  const [selStart, setSelStart] = useState<Date | null>(
    value?.startDate ?? null
  );
  const [selEnd, setSelEnd] = useState<Date | null>(value?.endDate ?? null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const rightMonth = leftMonth === 11 ? 0 : leftMonth + 1;
  const rightYear = leftMonth === 11 ? leftYear + 1 : leftYear;

  function handleDateClick(date: Date) {
    if (!selStart || (selStart && selEnd)) {
      setSelStart(date);
      setSelEnd(null);
    } else {
      const start = date < selStart ? date : selStart;
      const end = date < selStart ? selStart : date;
      setSelStart(start);
      setSelEnd(end);
      onChange({ mode: 'custom', startDate: start, endDate: end });
    }
  }

  function navigateLeft() {
    if (leftMonth === 0) {
      setLeftMonth(11);
      setLeftYear((y) => y - 1);
    } else {
      setLeftMonth((m) => m - 1);
    }
  }

  function navigateRight() {
    if (leftMonth === 11) {
      setLeftMonth(0);
      setLeftYear((y) => y + 1);
    } else {
      setLeftMonth((m) => m + 1);
    }
  }

  return (
    <div className="p-4">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={navigateLeft} className="p-1 rounded hover:bg-muted">
          <ChevronRight className="h-4 w-4" />
        </button>
        <div className="flex gap-8">
          <span className="text-sm font-medium">
            {ARABIC_MONTHS[leftMonth]} {leftYear}
          </span>
          <span className="text-sm font-medium">
            {ARABIC_MONTHS[rightMonth]} {rightYear}
          </span>
        </div>
        <button onClick={navigateRight} className="p-1 rounded hover:bg-muted">
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
      {/* Two calendars */}
      <div className="flex gap-6">
        <div className="flex-1">
          <CalendarGrid
            year={leftYear}
            month={leftMonth}
            selectedStart={selStart}
            selectedEnd={selEnd}
            hoverDate={hoverDate}
            onDateClick={handleDateClick}
            onDateHover={setHoverDate}
          />
        </div>
        <div className="w-px bg-border" />
        <div className="flex-1">
          <CalendarGrid
            year={rightYear}
            month={rightMonth}
            selectedStart={selStart}
            selectedEnd={selEnd}
            hoverDate={hoverDate}
            onDateClick={handleDateClick}
            onDateHover={setHoverDate}
          />
        </div>
      </div>
      {/* Selected range display */}
      {selStart && (
        <div className="mt-3 pt-3 border-t text-sm text-muted-foreground text-center">
          {selStart.toLocaleDateString('ar-EG')}
          {selEnd && selEnd.toDateString() !== selStart.toDateString() && (
            <> — {selEnd.toLocaleDateString('ar-EG')}</>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main DateRangePicker ─────────────────────────────────────────────────────
export function DateRangePicker({
  value,
  onChange,
  className,
  showCustomRange = true,
  minYear = 2020,
  maxYear = 2030,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'month' | 'custom' | 'preset'>(
    value.mode === 'month' ? 'month' : 'custom'
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Format display label
  function getLabel(): string {
    if (value.mode === 'month') {
      return `${ARABIC_MONTHS[value.month - 1]} ${value.year}`;
    }
    const v = value as CustomRangeFilter;
    if (v.label) return v.label;
    const start = v.startDate.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
    const end = v.endDate.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });
    if (v.startDate.toDateString() === v.endDate.toDateString()) return start;
    return `${start} - ${end}`;
  }

  const presets = getPresetRanges();

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border bg-background text-sm font-medium',
          'hover:bg-muted transition-colors',
          open && 'ring-2 ring-primary/30 border-primary/50',
        )}
      >
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span>{getLabel()}</span>
        <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            'absolute top-full mt-2 z-50 bg-background border rounded-xl shadow-xl',
            'animate-in fade-in slide-in-from-top-2 duration-150',
            showCustomRange ? 'w-auto min-w-[520px]' : 'w-64',
          )}
          style={{ right: 0 }}
        >
          {/* Tabs */}
          <div className="flex items-center border-b px-4 pt-3 gap-1">
            <button
              onClick={() => setActiveTab('month')}
              className={cn(
                'px-3 py-1.5 text-sm rounded-t-md -mb-px transition-colors',
                activeTab === 'month'
                  ? 'border border-b-background bg-background font-semibold text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              شهر / سنة
            </button>
            {showCustomRange && (
              <>
                <button
                  onClick={() => setActiveTab('preset')}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-t-md -mb-px transition-colors',
                    activeTab === 'preset'
                      ? 'border border-b-background bg-background font-semibold text-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  فترات سريعة
                </button>
                <button
                  onClick={() => setActiveTab('custom')}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-t-md -mb-px transition-colors',
                    activeTab === 'custom'
                      ? 'border border-b-background bg-background font-semibold text-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  نطاق مخصص
                </button>
              </>
            )}
            <div className="flex-1" />
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded hover:bg-muted text-muted-foreground mb-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'month' && (
            <MonthPicker
              value={value.mode === 'month' ? value : { mode: 'month', month: new Date().getMonth() + 1, year: new Date().getFullYear() }}
              onChange={(f) => { onChange(f); setOpen(false); }}
              minYear={minYear}
              maxYear={maxYear}
            />
          )}

          {activeTab === 'preset' && showCustomRange && (
            <div className="p-4 grid grid-cols-2 gap-2">
              {presets.map((p) => {
                const isActive =
                  value.mode === p.filter.mode &&
                  (p.filter.mode === 'month'
                    ? value.mode === 'month' &&
                      value.month === (p.filter as MonthYearFilter).month &&
                      value.year === (p.filter as MonthYearFilter).year
                    : value.mode === 'custom' &&
                      (value as CustomRangeFilter).label === (p.filter as CustomRangeFilter).label);
                return (
                  <button
                    key={p.label}
                    onClick={() => { onChange(p.filter); setOpen(false); }}
                    className={cn(
                      'px-3 py-2 rounded-lg text-sm text-right transition-colors border',
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'hover:bg-muted border-transparent',
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === 'custom' && showCustomRange && (
            <CustomRangePicker
              value={value.mode === 'custom' ? value : null}
              onChange={(f) => { onChange(f); setOpen(false); }}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Utility: Convert DateFilter to API params ────────────────────────────────
export function dateFilterToParams(filter: DateFilter): {
  year: number;
  month: number;
  startDate?: string;
  endDate?: string;
  isCustomRange: boolean;
} {
  if (filter.mode === 'month') {
    return {
      year: filter.year,
      month: filter.month,
      isCustomRange: false,
    };
  }
  const v = filter as CustomRangeFilter;
  return {
    year: v.startDate.getFullYear(),
    month: v.startDate.getMonth() + 1,
    startDate: formatLocalDate(v.startDate),
    endDate: formatLocalDate(v.endDate),
    isCustomRange: true,
  };
}

// ─── Default Filter (Current Month) ──────────────────────────────────────────
export function getCurrentMonthFilter(): MonthYearFilter {
  const now = new Date();
  return { mode: 'month', month: now.getMonth() + 1, year: now.getFullYear() };
}
