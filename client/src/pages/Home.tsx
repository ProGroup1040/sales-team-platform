import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { BarChart2, ShoppingCart, Users, Package, TrendingUp, ArrowLeft, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    setLocation('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-6" dir="rtl">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl w-full text-center space-y-10">
        {/* Logo & Title */}
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 backdrop-blur-sm mb-2">
            <BarChart2 className="w-10 h-10 text-indigo-400" />
          </div>
          <h1 className="text-5xl font-black text-white leading-tight">
            منظومة <span className="text-indigo-400">المبيعات</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            نظام إدارة مبيعات احترافي متكامل لمتابعة أداء فريقك وتحليل بياناتك بدقة وكفاءة عالية
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: TrendingUp, title: 'متابعة يومية', desc: 'مهام وأداء المهندسين' },
            { icon: ShoppingCart, title: 'إدارة الصفقات', desc: 'تتبع كل عملية بيع' },
            { icon: Users, title: 'العملاء والمعاينات', desc: 'متابعة شاملة' },
            { icon: Package, title: 'تحصيل وأهداف', desc: 'مؤشرات مالية وتخطيط' },
          ].map((feature) => (
            <div key={feature.title} className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm hover:bg-white/8 transition-colors">
              <feature.icon className="w-7 h-7 text-indigo-400 mb-3 mx-auto" />
              <h3 className="text-white font-semibold text-sm mb-1">{feature.title}</h3>
              <p className="text-slate-400 text-xs">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-4">
          <Button
            size="lg"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-6 text-lg font-semibold rounded-2xl shadow-2xl shadow-indigo-900/50 gap-3 transition-all hover:scale-105"
            onClick={() => window.location.href = getLoginUrl()}
          >
            ابدأ الآن
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <p className="text-slate-500 text-sm">سجّل دخولك للوصول إلى لوحة التحكم</p>
        </div>
      </div>
    </div>
  );
}
