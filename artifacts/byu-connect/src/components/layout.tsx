import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Map, Users, Search as SearchIcon, Plus, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Discover", href: "/", icon: Map },
  { name: "My Clubs", href: "/clubs", icon: Users },
  { name: "Search", href: "/search", icon: SearchIcon },
  { name: "Create Event", href: "/events/new", icon: Plus },
  { name: "Profile", href: "/profile", icon: UserIcon },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useAuth();

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
          {navItems.map((item) => {
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
        {navItems.map((item) => {
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
