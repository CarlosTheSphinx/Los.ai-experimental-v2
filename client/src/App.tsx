import { Switch, Route, useRoute } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Quotes from "@/pages/quotes";
import SignPage from "@/pages/sign";
import Agreements from "@/pages/agreements";
import AgreementDetail from "@/pages/agreement-detail";
import { AppLayout } from "@/components/AppLayout";

function MainRoutes() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/quotes" component={Quotes} />
        <Route path="/agreements" component={Agreements} />
        <Route path="/agreements/:id" component={AgreementDetail} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  const [isSignPage] = useRoute("/sign/:token");

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {isSignPage ? (
          <Switch>
            <Route path="/sign/:token" component={SignPage} />
          </Switch>
        ) : (
          <MainRoutes />
        )}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
