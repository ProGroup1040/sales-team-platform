import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Calendar, CheckCircle, Clock, XCircle, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const STATUS_LABELS: Record<string, string> = { planned: 'مخطط', completed: 'منجز', delayed: 'متأخر', not_done: 'لم يُنفذ' };
const STATUS_COLORS: Record<string, string> = { planned: 'bg-indigo-100 text-indigo-700', completed: 'bg-emerald-100 text-emerald-700', delayed: 'bg-amber-100 text-amber-700', not_done: 'bg-red-100 text-red-700' };
const PRIORITY_LABELS: Record<string, string> = { low: 'منخفض', medium: 'متوسط', high: 'عالي', urgent: 'عاجل' };
const PRIORITY_COLORS: Record<string, string> = { low: 'bg-slate-100 text-slate-600', medium: 'bg-blue-100 text-blue-700', high: 'bg-orange-100 text-orange-700', urgent: 'bg-red-100 text-red-700' };

function getDateStr(offset: number) {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

export default function TasksModule() {
  const [dateOffset, setDateOffset] = useState(0);
  const [filterEng, setFilterEng] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState({ engineerId: '', title: '', description: '', plannedHours: '1', priority: 'medium' });

  const dateStr = getDateStr(dateOffset);
  const utils = trpc.useUtils();

  const { data: engineers } = trpc.engineers.list.useQuery();
  const { data: stats, isLoading: statsLoading } = trpc.tasks.stats.useQuery({ date: dateStr });
  const { data: tasks, isLoading: tasksLoading } = trpc.tasks.list.useQuery({
    date: dateStr, engineerId: filterEng !== 'all' ? parseInt(filterEng) : undefined
  });

  const createMutation = trpc.tasks.create.useMutation({
    onSuccess: () => { toast.success('تم إضافة المهمة'); setShowAdd(false); utils.tasks.list.invalidate(); utils.tasks.stats.invalidate(); },
    onError: () => toast.error('حدث خطأ'),
  });
  const updateMutation = trpc.tasks.updateStatus.useMutation({
    onSuccess: () => { toast.success('تم تحديث الحالة'); utils.tasks.list.invalidate(); utils.tasks.stats.invalidate(); },
    onError: () => toast.error('حدث خطأ'),
  });

  const chartData = useMemo(() => stats?.byEngineer?.map(e => ({
    name: e.engineerName.split(' ')[0],
    'Execution Score': e.executionScore,
    منجز: e.completed, متأخر: e.delayed, 'لم يُنفذ': e.not_done,
  })) ?? [], [stats]);

  const handleCreate = () => {
    if (!newTask.engineerId || !newTask.title) return toast.error('يرجى ملء الحقول المطلوبة');
    createMutation.mutate({ engineerId: parseInt(newTask.engineerId), taskDate: dateStr, title: newTask.title, description: newTask.description, plannedHours: parseFloat(newTask.plannedHours), priority: newTask.priority as any });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Daily Tasks Module</h1>
          <p className="text-sm text-muted-foreground">متابعة تنفيذ المهام اليومية للمهندسين</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setDateOffset(d => d - 1)}><ChevronRight className="w-4 h-4" /></Button>
          <div className="text-sm font-medium px-3 py-1.5 bg-muted rounded-lg min-w-[120px] text-center">
            {dateOffset === 0 ? 'اليوم' : dateOffset === -1 ? 'أمس' : new Date(dateStr).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
          </div>
          <Button variant="outline" size="icon" onClick={() => setDateOffset(d => d + 1)} disabled={dateOffset >= 0}><ChevronLeft className="w-4 h-4" /></Button>
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5"><Plus className="w-4 h-4" />إضافة مهمة</Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'المخططة', val: stats?.planned ?? 0, icon: Calendar, color: 'text-indigo-600 bg-indigo-100' },
          { label: 'المنجزة', val: stats?.completed ?? 0, icon: CheckCircle, color: 'text-emerald-600 bg-emerald-100' },
          { label: 'المتأخرة', val: stats?.delayed ?? 0, icon: Clock, color: 'text-amber-600 bg-amber-100' },
          { label: 'لم تُنفذ', val: stats?.not_done ?? 0, icon: XCircle, color: 'text-red-600 bg-red-100' },
        ].map(({ label, val, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`p-2.5 rounded-xl ${color.split(' ')[1]}`}><Icon className={`w-5 h-5 ${color.split(' ')[0]}`} /></div>
              <div><p className="text-2xl font-bold">{val}</p><p className="text-xs text-muted-foreground">{label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Engineers Performance */}
      {stats?.byEngineer && stats.byEngineer.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">أداء المهندسين - Execution Score</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`${v}%`]} />
                  <Bar dataKey="Execution Score" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry['Execution Score'] >= 90 ? '#10b981' : entry['Execution Score'] >= 70 ? '#6366f1' : entry['Execution Score'] >= 50 ? '#f59e0b' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">تفاصيل أداء كل مهندس</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {stats.byEngineer.map(eng => (
                <div key={eng.engineerId} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{eng.engineerName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{eng.executionScore}%</span>
                      <Badge className={`text-xs ${eng.rating === 'ممتاز' ? 'bg-emerald-100 text-emerald-700' : eng.rating === 'جيد' ? 'bg-blue-100 text-blue-700' : eng.rating === 'مقبول' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {eng.rating}
                      </Badge>
                    </div>
                  </div>
                  <Progress value={eng.executionScore} className="h-2" />
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>✅ {eng.completed}</span>
                    <span>⏰ {eng.delayed}</span>
                    <span>❌ {eng.not_done}</span>
                    <span className="text-xs text-muted-foreground">من {eng.planned} مخطط</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tasks List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">قائمة المهام</CardTitle>
            <Select value={filterEng} onValueChange={setFilterEng}>
              <SelectTrigger className="w-44 h-8 text-sm"><SelectValue placeholder="كل المهندسين" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المهندسين</SelectItem>
                {engineers?.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {tasksLoading ? (
            <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
          ) : !tasks || tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">لا توجد مهام لهذا اليوم</div>
          ) : (
            <div className="space-y-2">
              {tasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{task.title}</span>
                      <Badge className={`text-xs ${PRIORITY_COLORS[task.priority]}`}>{PRIORITY_LABELS[task.priority]}</Badge>
                    </div>
                    {task.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>}
                    <p className="text-xs text-muted-foreground mt-0.5">{task.plannedHours} ساعة</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={`text-xs ${STATUS_COLORS[task.status]}`}>{STATUS_LABELS[task.status]}</Badge>
                    {task.status === 'planned' && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-emerald-600 hover:bg-emerald-50" onClick={() => updateMutation.mutate({ id: task.id, status: 'completed' })}>✓</Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-amber-600 hover:bg-amber-50" onClick={() => updateMutation.mutate({ id: task.id, status: 'delayed' })}>⏰</Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-600 hover:bg-red-50" onClick={() => updateMutation.mutate({ id: task.id, status: 'not_done' })}>✗</Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Task Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>إضافة مهمة جديدة</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>المهندس *</Label>
              <Select value={newTask.engineerId} onValueChange={v => setNewTask(p => ({ ...p, engineerId: v }))}>
                <SelectTrigger><SelectValue placeholder="اختر المهندس" /></SelectTrigger>
                <SelectContent>{engineers?.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>عنوان المهمة *</Label><Input value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} placeholder="عنوان المهمة" /></div>
            <div><Label>الوصف</Label><Textarea value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>الساعات المخططة</Label><Input type="number" value={newTask.plannedHours} onChange={e => setNewTask(p => ({ ...p, plannedHours: e.target.value }))} min="0.5" step="0.5" /></div>
              <div><Label>الأولوية</Label>
                <Select value={newTask.priority} onValueChange={v => setNewTask(p => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>إلغاء</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>إضافة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
