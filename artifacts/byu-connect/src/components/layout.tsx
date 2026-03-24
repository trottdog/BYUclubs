import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useGetClubs, useGetEvents } from "@workspace/api-client-react";
import { Activity, CalendarDays, Map, Plus, ShieldCheck, User as UserIcon, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Discover", href: "/", icon: Map },
  { name: "My Clubs", href: "/clubs", icon: Users },
  { name: "Create Event", href: "/events/new", icon: Plus },
  { name: "Profile", href: "/profile", icon: UserIcon },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useAuth();
  const { data: events } = useGetEvents();
  const { data: clubs } = useGetClubs();
  const totalEvents = events?.length ?? 0;
  const totalClubs = clubs?.length ?? 0;
  const isSuperAdmin = Boolean(
    user?.email &&
      new Set(["byu_admin@byu.edu", "gunnjake@byu.edu"]).has(user.email.toLowerCase()),
  );
  const visibleNavItems = isSuperAdmin
    ? [...navItems, { name: "Super Admin", href: "/super-admin", icon: ShieldCheck }]
    : navItems;

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 bg-secondary text-secondary-foreground z-50">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-3 cursor-pointer font-bold text-2xl text-white">
            <span className="bg-white text-secondary w-9 h-9 flex items-center justify-center rounded-lg font-extrabold text-xl shadow-md">Y</span>
            BYUconnect
          </Link>
        </div>

        <nav className="flex-1 px-4 mt-4 space-y-2 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.name} href={item.href}>
                <span
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer text-sm font-medium",
                    isActive
                      ? "bg-secondary-foreground/10 text-white border-l-4 border-primary shadow-sm"
                      : "text-secondary-foreground/70 hover:text-white hover:bg-secondary-foreground/5 border-l-4 border-transparent"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {isSuperAdmin && (
          <div className="px-4 pb-3">
            <div className="rounded-xl border border-secondary-foreground/20 bg-secondary-foreground/5 p-4 shadow-sm">
              <div className="flex items-start gap-2">
                <Activity className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-secondary-foreground/70">
                    Campus Snapshot
                  </p>
                  <p className="mt-1 text-xs text-secondary-foreground/80 leading-relaxed">
                    Live totals to help you see what is happening across BYUconnect right now.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-secondary-foreground/10 p-3 border border-secondary-foreground/10">
                  <p className="text-[11px] text-secondary-foreground/80 flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5" />
                    Events
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-white">{totalEvents}</p>
                </div>
                <div className="rounded-lg bg-secondary-foreground/10 p-3 border border-secondary-foreground/10">
                  <p className="text-[11px] text-secondary-foreground/80 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Clubs
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-white">{totalClubs}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 border-t border-secondary-foreground/10">
          {user ? (
            <Link href="/profile" className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary-foreground/5 cursor-pointer transition-colors group">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold uppercase text-sm shrink-0 shadow-sm border border-primary-foreground/20 group-hover:border-white transition-colors">
                {user.firstName[0]}
                {user.lastName[0]}
              </div>
              <div className="overflow-hidden">
                <div className="text-sm font-semibold text-white truncate">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-xs text-secondary-foreground/60 truncate">
                  {user.email}
                </div>
              </div>
            </Link>
          ) : (
            <Link href="/auth">
              <span className="block w-full py-3 px-4 text-center rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold transition-colors cursor-pointer text-sm shadow-md">
                Sign In
              </span>
            </Link>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 pb-20 md:pb-0 min-h-screen">
        <div className="max-w-6xl mx-auto p-4 md:p-8 lg:p-10">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 flex items-center justify-around px-2 py-2 safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {visibleNavItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.name} href={item.href}>
              <span
                className={cn(
                  "flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all cursor-pointer gap-1",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className={cn("w-6 h-6 transition-transform", isActive && "stroke-[2.5px] scale-110")} />
                <span className="text-[10px] font-semibold hidden sm:block">{item.name}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
