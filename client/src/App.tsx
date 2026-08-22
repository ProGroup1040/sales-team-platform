import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";

// New Control Panel Modules
import Overview from "./pages/Overview";
import TasksModule from "./pages/TasksModule";
import LeadsModule from "./pages/LeadsModule";
import VisitsModule from "./pages/VisitsModule";
import ClosingModule from "./pages/ClosingModule";
import SalesModule from "./pages/SalesModule";
import KPIModule from "./pages/KPIModule";
import CollectionsModule from "./pages/CollectionsModule";
import PlanningModule from "./pages/PlanningModule";
import LoginPage from "./pages/LoginPage";
import PromotionSystem from "./pages/PromotionSystem";
import ReportsModule from "./pages/ReportsModule";
import SalesExecutionSystem from "./pages/SalesExecutionSystem";
import UserManagement from "@/pages/UserManagement";
import PermissionsPanel from "@/pages/PermissionsPanel";
import ProjectTimelineModule from "@/pages/ProjectTimelineModule";

function withLayout(Component: React.ComponentType) {
  return (
    <DashboardLayout>
      <Component />
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/login"} component={LoginPage} />

      {/* Control Panel Routes */}
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

      {/* Legacy routes redirect */}
      <Route path={"/dashboard"}>{withLayout(Overview)}</Route>

      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
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
