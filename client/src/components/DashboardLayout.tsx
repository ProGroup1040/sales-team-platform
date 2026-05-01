import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { useLocalAuth } from "@/hooks/useLocalAuth";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { LayoutDashboard, PanelLeft, BarChart2, CheckSquare, UserPlus, MapPin, Handshake, TrendingUp, Award, DollarSign, Target, LogOut, Crown, Zap, FileBarChart, Users, Shield } from "lucide-react";
import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

const menuGroupsConfig = [
  {
    label: 'لوحة التحكم',
    items: [
      { icon: LayoutDashboard, label: 'نظرة عامة', path: '/overview', accessKey: 'canSeeOverview' as const },
    ]
  },
  {
    label: 'التشغيل',
    items: [
      { icon: CheckSquare, label: 'المهام اليومية', path: '/tasks', accessKey: 'canSeeTasks' as const },
      { icon: UserPlus, label: 'العملاء المحتملون', path: '/leads', accessKey: 'canSeeLeads' as const },
      { icon: MapPin, label: 'المعاينات', path: '/visits', accessKey: 'canSeeVisits' as const },
      { icon: Handshake, label: 'الإغلاق والتفاوض', path: '/closing', accessKey: 'canSeeClosing' as const },
    ]
  },
  {
    label: 'الأداء والمالية',
    items: [
      { icon: TrendingUp, label: 'المبيعات', path: '/sales-module', accessKey: 'canSeeSalesModule' as const },
      { icon: Award, label: 'مؤشرات الأداء', path: '/kpi', accessKey: 'canSeeKPI' as const },
      { icon: DollarSign, label: 'التحصيل المالي', path: '/collections', accessKey: 'canSeeCollections' as const },
      { icon: Target, label: 'تخطيط الأهداف', path: '/planning', accessKey: 'canSeePlanning' as const },
    ]
  },
  {
    label: 'تحليل وتقارير',
    items: [
      { icon: FileBarChart, label: 'التقارير', path: '/reports', accessKey: 'canSeeReports' as const },
    ]
  },
  {
    label: 'تنفيذ المبيعات',
    items: [
      { icon: Zap, label: 'Sales Execution', path: '/sales-execution', accessKey: 'canSeeSalesExecution' as const },
    ]
  },
  {
    label: 'إدارة الفريق',
    items: [
      { icon: Crown, label: 'التقييم والترقية', path: '/promotion-system', accessKey: 'canSeePromotion' as const },
      { icon: Users, label: 'إدارة المستخدمين', path: '/user-management', accessKey: 'canSeePromotion' as const },
      { icon: Shield, label: 'لوحة الصلاحيات', path: '/permissions', accessKey: 'canSeePromotion' as const },
    ]
  },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const [location, setLocation] = useLocation();
  const { session, isLoading } = useLocalAuth();
  const access = useRoleAccess(session?.role);
  const utils = trpc.useUtils();
  const logoutMut = trpc.localAuth.logout.useMutation({
    onSuccess: () => {
      utils.localAuth.me.invalidate();
      setLocation("/login");
    },
  });

  // Auth check disabled temporarily - open access mode
  // useEffect(() => {
  //   if (!isLoading && !session) {
  //     setLocation("/login");
  //   }
  // }, [isLoading, session, setLocation]);

  // Filter menuGroups based on role access
  const menuGroups = useMemo(() => {
    return menuGroupsConfig
      .map(group => ({
        ...group,
        items: group.items.filter(item => access[item.accessKey]),
      }))
      .filter(group => group.items.length > 0);
  }, [access]);

  const menuItems = useMemo(() => menuGroups.flatMap(g => g.items), [menuGroups]);

  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  // Auth loading/guard disabled temporarily - open access mode

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <BarChart2 className="h-5 w-5 text-sidebar-primary shrink-0" />
                  <span className="font-bold tracking-tight truncate text-sidebar-foreground">
                    منظومات مبيعات Pro Group
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            {menuGroups.map((group, gi) => (
              <div key={gi}>
                {!isCollapsed && gi > 0 && (
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">{group.label}</p>
                  </div>
                )}
                <SidebarMenu className="px-2 py-0.5">
                  {group.items.map(item => {
                    const isActive = location === item.path;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className={`h-9 transition-all font-normal`}
                        >
                          <item.icon className={`h-4 w-4 ${isActive ? 'text-primary' : ''}`} />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </div>
            ))}
          </SidebarContent>

          <SidebarFooter className="p-3">
              <div className="flex items-center gap-3 rounded-lg px-1 py-1 w-full">
              <Avatar className="h-9 w-9 border shrink-0">
                <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                  {session?.name?.charAt(0)?.toUpperCase() ?? "P"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-medium truncate leading-none">
                  {session?.name ?? "Pro Group"}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-1.5">
                  {session?.role === "admin" ? "مدير النظام" :
                   session?.role === "manager" ? "مدير" :
                   session?.role === "admin_sales" ? "Admin Sales" :
                   session?.role === "sales_engineer" ? "مهندس مبيعات" :
                   session?.role === "engineer" ? "مهندس" :
                   session?.role === "sales_specialist" ? "أخصائي مبيعات" :
                   session?.role === "tele_sales" ? "Tele Sales" :
                   session?.role === "interior_designer" ? "مصمم داخلي" :
                   session?.role === "site_engineer" ? "مهندس موقع" :
                   session?.role === "system_user" ? "مستخدم النظام" : "مستخدم"}
                </p>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem?.label ?? "القائمة"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
    </>
  );
}
