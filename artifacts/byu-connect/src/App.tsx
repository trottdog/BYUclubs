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
import CreateEvent from "@/pages/create-event";
import Profile from "@/pages/profile";
import Auth from "@/pages/auth";
import SuperAdmin from "@/pages/super-admin";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={Auth} />
      <Route path="/">
        <Layout>
          <Discover />
        </Layout>
      </Route>
      <Route path="/events/new">
        <Layout>
          <CreateEvent />
        </Layout>
      </Route>
      <Route path="/events/:id">
        {(params) => (
          <Layout>
            <EventDetail routeParams={params} />
          </Layout>
        )}
      </Route>
      <Route path="/clubs">
        <Layout>
          <MyClubs />
        </Layout>
      </Route>
      <Route path="/clubs/:id">
        {(params) => (
          <Layout>
            <ClubDetail routeParams={params} />
          </Layout>
        )}
      </Route>
      <Route path="/search">
        {() => {
          window.history.replaceState(null, "", "/");
          window.dispatchEvent(new PopStateEvent("popstate"));
          return null;
        }}
      </Route>
      <Route path="/profile">
        <Layout>
          <Profile />
        </Layout>
      </Route>
      <Route path="/super-admin">
        <Layout>
          <SuperAdmin />
        </Layout>
      </Route>
      <Route>
        <Layout>
          <NotFound />
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
