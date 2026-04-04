import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  TrendingUp, TrendingDown, ShoppingCart, Users, Package,
  DollarSign, ArrowUpRight, ArrowDownRight, RefreshCw, Loader2
} from "lucide-react";
import { toast } from "sonner";

const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

const STATUS_LABELS: Record<string, string> = {
  pending: 'معلق',
  confirmed: 'مؤكد',
  shipped: 'مشحون',
  delivered: 'مسلّم',
  cancelled: 'ملغي',
};

const MONTH_NAMES: Record<string, string> = {
  '01': 'يناير', '02': 'فبراير', '03': 'مارس', '04': 'أبريل',
  '05': 'مايو', '06': 'يونيو', '07': 'يوليو', '08': 'أغسطس',
  '09': 'سبتمبر', '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ar-SA').format(value);
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  growth?: number;
  icon: React.ReactNode;
  gradient: string;
}

function StatCard({ title, value, subtitle, growth, icon, gradient }: StatCardProps) {
  const isPositive = (growth ?? 0) >= 0;
  return (
    <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <div className={`absolute inset-0 opacity-90 ${gradient}`} />
      <CardContent className="relative p-6 text-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-white/80 text-sm font-medium mb-1">{title}</p>
            <p className="text-3xl font-bold mb-1">{value}</p>
            <p className="text-white/70 text-xs">{subtitle}</p>
          </div>
          <div className="bg-white/20 rounded-xl p-3 backdrop-blur-sm">
            {icon}
          </div>
        </div>
        {growth !== undefined && (
          <div className="flex items-center gap-1 mt-3">
            {isPositive ? (
              <ArrowUpRight className="w-4 h-4 text-white/90" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-white/90" />
            )}
            <span className="text-white/90 text-sm font-medium">
              {Math.abs(growth).toFixed(1)}% مقارنة بالشهر الماضي
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const utils = trpc.useUtils();
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();
  const { data: trend, isLoading: trendLoading } = trpc.dashboard.monthlySalesTrend.useQuery({ months: 12 });
  const { data: byStatus, isLoading: statusLoading } = trpc.dashboard.salesByStatus.useQuery();
  const { data: isSeeded } = trpc.dashboard.isSeeded.useQuery();

  const seedMutation = trpc.dashboard.seedData.useMutation({
    onSuccess: () => {
      toast.success('تم تحميل البيانات التجريبية بنجاح!');
      utils.dashboard.stats.invalidate();
      utils.dashboard.monthlySalesTrend.invalidate();
      utils.dashboard.salesByStatus.invalidate();
      utils.dashboard.isSeeded.invalidate();
    },
    onError: (err) => toast.error(`خطأ: ${err.message}`),
  });

  const trendData = (trend ?? []).map(item => ({
    month: MONTH_NAMES[item.month?.split('-')[1] ?? ''] ?? item.month,
    المبيعات: parseFloat(item.total ?? '0'),
    الطلبات: item.orderCount,
  }));

  const statusData = (byStatus ?? []).map(item => ({
    name: STATUS_LABELS[item.status] ?? item.status,
    value: item.count,
    total: parseFloat(item.total ?? '0'),
  }));

  const isLoading = statsLoading || trendLoading || statusLoading;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">لوحة التحكم</h1>
          <p className="text-muted-foreground text-sm mt-1">نظرة عامة على أداء المبيعات</p>
        </div>
        {!isSeeded && (
          <Button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="gap-2"
          >
            {seedMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            تحميل البيانات التجريبية
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              title="إجمالي المبيعات"
              value={formatCurrency(stats?.totalSales ?? 0)}
              subtitle={`هذا الشهر: ${formatCurrency(stats?.monthSales ?? 0)}`}
              growth={stats?.salesGrowth}
              icon={<DollarSign className="w-6 h-6 text-white" />}
              gradient="bg-gradient-to-br from-indigo-600 to-violet-700"
            />
            <StatCard
              title="إجمالي الطلبات"
              value={formatNumber(stats?.totalOrders ?? 0)}
              subtitle={`هذا الشهر: ${formatNumber(stats?.monthOrders ?? 0)} طلب`}
              growth={stats?.ordersGrowth}
              icon={<ShoppingCart className="w-6 h-6 text-white" />}
              gradient="bg-gradient-to-br from-cyan-500 to-blue-600"
            />
            <StatCard
              title="إجمالي العملاء"
              value={formatNumber(stats?.totalCustomers ?? 0)}
              subtitle={`جدد هذا الشهر: ${formatNumber(stats?.newCustomers ?? 0)}`}
              icon={<Users className="w-6 h-6 text-white" />}
              gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
            />
            <StatCard
              title="متوسط قيمة الطلب"
              value={formatCurrency(stats?.avgOrderValue ?? 0)}
              subtitle="متوسط قيمة كل عملية بيع"
              icon={<Package className="w-6 h-6 text-white" />}
              gradient="bg-gradient-to-br from-amber-500 to-orange-600"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Sales Trend Chart */}
            <Card className="xl:col-span-2 shadow-sm border border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  اتجاه المبيعات الشهري
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={trendData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', direction: 'rtl' }}
                      formatter={(value: number) => [formatCurrency(value), 'المبيعات']}
                    />
                    <Area type="monotone" dataKey="المبيعات" stroke="#6366f1" strokeWidth={2.5} fill="url(#salesGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Status Pie Chart */}
            <Card className="shadow-sm border border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">توزيع حالات الطلبات</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', direction: 'rtl' }}
                      formatter={(value: number, name: string) => [value, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {statusData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Products & Monthly Orders */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Top Products */}
            <Card className="shadow-sm border border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  أفضل المنتجات مبيعاً
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(stats?.topProducts ?? []).map((product, index) => (
                    <div key={product.productId} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.productName}</p>
                        <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, (parseFloat(product.totalRevenue ?? '0') / parseFloat((stats?.topProducts?.[0]?.totalRevenue ?? '1'))) * 100)}%`,
                              backgroundColor: COLORS[index % COLORS.length]
                            }}
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(parseFloat(product.totalRevenue ?? '0'))}</p>
                        <p className="text-xs text-muted-foreground">{product.totalQty} وحدة</p>
                      </div>
                    </div>
                  ))}
                  {(stats?.topProducts ?? []).length === 0 && (
                    <p className="text-muted-foreground text-sm text-center py-4">لا توجد بيانات</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Monthly Orders Bar Chart */}
            <Card className="shadow-sm border border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                  عدد الطلبات الشهرية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                    <Tooltip
                      contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', direction: 'rtl' }}
                      formatter={(value: number) => [value, 'الطلبات']}
                    />
                    <Bar dataKey="الطلبات" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
