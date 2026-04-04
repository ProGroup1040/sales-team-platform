import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Sales from "./pages/Sales";
import Customers from "./pages/Customers";
import Products from "./pages/Products";
import Home from "./pages/Home";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/dashboard"}>
        <DashboardLayout>
          <Dashboard />
        </DashboardLayout>
      </Route>
      <Route path={"/sales"}>
        <DashboardLayout>
          <Sales />
        </DashboardLayout>
      </Route>
      <Route path={"/customers"}>
        <DashboardLayout>
          <Customers />
        </DashboardLayout>
      </Route>
      <Route path={"/products"}>
        <DashboardLayout>
          <Products />
        </DashboardLayout>
      </Route>
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster position="top-center" richColors />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
