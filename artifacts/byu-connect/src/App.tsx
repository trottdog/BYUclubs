import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/contexts/AuthContext";
import { Layout } from "@/components/layout";

import NotFound from "@/pages/not-found";
import Discover from "@/pages/discover";
import EventDetail from "@/pages/event-detail";
import MyClubs from "@/pages/my-clubs";
import ClubDetail from "@/pages/club-detail";
import Search from "@/pages/search";
import CreateEvent from "@/pages/create-event";
import Profile from "@/pages/profile";
import Auth from "@/pages/auth";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={Auth} />
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={Discover} />
            <Route path="/events/new" component={CreateEvent} />
            <Route path="/events/:id">
              {(params) => <EventDetail routeParams={params} />}
            </Route>
            <Route path="/clubs" component={MyClubs} />
            <Route path="/clubs/:id">
              {(params) => <ClubDetail routeParams={params} />}
            </Route>
            <Route path="/search" component={Search} />
            <Route path="/profile" component={Profile} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
