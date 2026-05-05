import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart3, Lock, User, Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // شاشة تغيير كلمة المرور
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  const changePasswordMut = trpc.appUsers.changePassword.useMutation({
    onSuccess: () => {
      toast.success("تم تغيير كلمة المرور بنجاح! يمكنك الآن استخدام النظام.");
      setLocation("/overview");
    },
    onError: (e) => {
      toast.error(e.message || "حدث خطأ أثناء تغيير كلمة المرور");
    },
  });

  const loginMut = trpc.localAuth.login.useMutation({
    onSuccess: (data) => {
      if (data.forcePasswordChange) {
        // إجبار تغيير كلمة المرور
        setShowChangePassword(true);
        toast.info(`أهلاً ${data.name}! يجب تغيير كلمة المرور قبل المتابعة.`, { duration: 5000 });
      } else {
        toast.success(`أهلاً ${data.name}!`);
        setLocation("/overview");
      }
    },
    onError: (e) => {
      toast.error(e.message || "يوزرنيم أو باسورد غلط");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error("برجاء إدخال اليوزرنيم والباسورد");
      return;
    }
    loginMut.mutate({ username: username.trim(), password });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("كلمة المرور وتأكيدها غير متطابقين");
      return;
    }
    if (newPassword === password) {
      toast.error("كلمة المرور الجديدة يجب أن تختلف عن القديمة");
      return;
    }
    changePasswordMut.mutate({ oldPassword: password, newPassword });
  };

  // شاشة تغيير كلمة المرور الإجباري
  if (showChangePassword) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center">
              <div className="bg-amber-500/10 p-4 rounded-2xl">
                <ShieldCheck className="h-10 w-10 text-amber-500" />
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">تغيير كلمة المرور</h1>
            <p className="text-sm text-muted-foreground">يجب تغيير كلمة المرور قبل المتابعة</p>
          </div>

          <Card className="border-amber-500/20 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-center flex items-center justify-center gap-2">
                <KeyRound className="h-4 w-4 text-amber-500" />
                إنشاء كلمة مرور جديدة
              </CardTitle>
              <CardDescription className="text-center text-xs">
                هذه أول مرة تسجل دخولك. يرجى إنشاء كلمة مرور شخصية.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm">كلمة المرور الجديدة</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="6 أحرف على الأقل"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pr-10 pl-10 text-sm"
                      dir="ltr"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm">تأكيد كلمة المرور</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="أعد كتابة كلمة المرور"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pr-10 text-sm"
                      dir="ltr"
                    />
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-destructive">كلمتا المرور غير متطابقتين</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                  disabled={changePasswordMut.isPending}
                >
                  {changePasswordMut.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      جاري الحفظ...
                    </span>
                  ) : (
                    "حفظ كلمة المرور والدخول"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            Pro Group — منظومة مبيعات
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo / Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center">
            <div className="bg-primary/10 p-4 rounded-2xl">
              <BarChart3 className="h-10 w-10 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">منظومة مبيعات</h1>
          <p className="text-sm text-muted-foreground">لوحة التحكم الرئيسية</p>
        </div>

        {/* Login Card */}
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-base text-center flex items-center justify-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              تسجيل الدخول
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm">اسم المستخدم</Label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="أدخل اسم المستخدم"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pr-10 text-sm"
                    autoComplete="username"
                    autoFocus
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm">كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="أدخل كلمة المرور"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10 pl-10 text-sm"
                    autoComplete="current-password"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loginMut.isPending}
              >
                {loginMut.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    جاري التحقق...
                  </span>
                ) : (
                  "دخول"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Pro Group — منظومة مبيعات
        </p>
      </div>
    </div>
  );
}
