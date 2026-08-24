import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { lazy, Suspense, type ComponentType } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import LoginPage from "./pages/LoginPage";

const Overview = lazy(() => import("./pages/Overview"));
const TasksModule = lazy(() => import("./pages/TasksModule"));
const LeadsModule = lazy(() => import("./pages/LeadsModule"));
const VisitsModule = lazy(() => import("./pages/VisitsModule"));
const ClosingModule = lazy(() => import("./pages/ClosingModule"));
const SalesModule = lazy(() => import("./pages/SalesModule"));
const KPIModule = lazy(() => import("./pages/KPIModule"));
const CollectionsModule = lazy(() => import("./pages/CollectionsModule"));
const PlanningModule = lazy(() => import("./pages/PlanningModule"));
const PromotionSystem = lazy(() => import("./pages/PromotionSystem"));
const ReportsModule = lazy(() => import("./pages/ReportsModule"));
const SalesExecutionSystem = lazy(() => import("./pages/SalesExecutionSystem"));
const UserManagement = lazy(() => import("@/pages/UserManagement"));
const PermissionsPanel = lazy(() => import("@/pages/PermissionsPanel"));
const ProjectTimelineModule = lazy(() => import("@/pages/ProjectTimelineModule"));

function withLayout(Component: ComponentType) {
  return (
    <DashboardLayout>
      <Component />
    </DashboardLayout>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen grid place-items-center bg-background text-foreground" aria-busy="true">
      جاري تحميل الصفحة...
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/login"} component={LoginPage} />

        <Route path={"/overview"}>{withLayout(Overview)}</Route>
        <Route path={"/tasks"}>{withLayout(TasksModule)}</Route>
        <Route path={"/leads"}>{withLayout(LeadsModule)}</Route>
        <Route path={"/visits"}>{withLayout(VisitsModule)}</Route>
        <Route path={"/closing"}>{withLayout(ClosingModule)}</Route>
        <Route path={"/sales-module"}>{withLayout(SalesModule)}</Route>
        <Route path={"/kpi"}>{withLayout(KPIModule)}</Route>
        <Route path={"/collections"}>{withLayout(CollectionsModule)}</Route>
        <Route path={"/planning"}>{withLayout(PlanningModule)}</Route>
        <Route path={"/promotion-system"}>{withLayout(PromotionSystem)}</Route>
        <Route path={"/reports"}>{withLayout(ReportsModule)}</Route>
        <Route path={"/sales-execution"}>{withLayout(SalesExecutionSystem)}</Route>
        <Route path={"/project-timeline"}>{withLayout(ProjectTimelineModule)}</Route>
        <Route path={"/user-management"}>{withLayout(UserManagement)}</Route>
        <Route path={"/permissions"}>{withLayout(PermissionsPanel)}</Route>

        <Route path={"/dashboard"}>{withLayout(Overview)}</Route>
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster position="top-center" richColors />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
