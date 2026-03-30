import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { authHrefWithReturn } from "@/lib/auth-return";
import { useGetClubs, useGetEvents } from "@workspace/api-client-react";
import { Activity, CalendarDays, Map, Plus, ShieldCheck, User as UserIcon, Users, Menu, X, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const navItems = [
  { name: "Discover", href: "/", icon: Map },
  { name: "My Clubs", href: "/clubs", icon: Users },
  { name: "Create Event", href: "/events/new", icon: Plus },
  { name: "Profile", href: "/profile", icon: UserIcon },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const isAuthPage = location === "/auth";
  const { user } = useAuth();
  const { data: events } = useGetEvents();
  const { data: clubs } = useGetClubs();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const totalEvents = events?.length ?? 0;
  const totalClubs = clubs?.length ?? 0;
  const isSuperAdmin = Boolean(
    user?.email &&
      new Set(["byu_admin@byu.edu", "gunnjake@byu.edu"]).has(user.email.toLowerCase()),
  );
  const visibleNavItems = isSuperAdmin
    ? [...navItems, { name: "Super Admin", href: "/super-admin", icon: ShieldCheck }]
    : navItems;

  if (isAuthPage) {
    return (
      <div className="min-h-screen w-full bg-background text-foreground selection:bg-primary/20 selection:text-primary">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex w-full bg-background selection:bg-primary/20 selection:text-primary">
      {/* Official BYU Sidebar */}
      <aside className="hidden md:flex flex-col w-72 fixed inset-y-0 left-0 bg-sidebar text-sidebar-foreground z-50 border-r border-sidebar-border overflow-hidden shadow-xl">
        {/* Subtle accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/10" />
        
        <div className="p-10">
          <Link href="/" className="flex flex-col gap-0 cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white flex items-center justify-center border border-white group-hover:bg-accent transition-colors duration-200">
                 <img src="/images/logo.png" alt="BYU" className="w-full h-full object-contain p-1" />
              </div>
              <div className="flex flex-col">
                <span className="font-sans font-black text-2xl tracking-tighter leading-none text-white uppercase italic">BYU</span>
                <span className="font-sans font-bold text-[9px] uppercase tracking-[0.4em] text-white/50 leading-none mt-1">Connect</span>
              </div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 mt-6 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item, idx) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                <Link href={item.href}>
                  <span
                    className={cn(
                      "flex items-center justify-between px-6 py-4 transition-all duration-200 cursor-pointer text-[10px] font-black uppercase tracking-[0.2em]",
                      isActive
                        ? "bg-white text-primary shadow-lg"
                        : "text-white/40 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <item.icon className={cn("w-4 h-4", isActive ? "stroke-[3px]" : "stroke-[2px]")} />
                      {item.name}
                    </div>
                    {isActive && <ArrowUpRight className="w-3 h-3" />}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </nav>

        {isSuperAdmin && (
          <div className="px-6 pb-10">
            <div className="connect-panel border-white/10 bg-white/5 relative group">
              <div className="flex items-start gap-3 relative z-10">
                <Activity className="w-3.5 h-3.5 mt-0.5 text-white shrink-0" />
                <div>
                  <p className="connect-eyebrow !text-[9px] !text-white/40">
                    LIVE CAMPUS
                  </p>
                  <p className="mt-2 text-[10px] text-white leading-relaxed font-bold uppercase tracking-tight">
                    Events and clubs across campus at a glance.
                  </p>
                </div>
              </div>
              <div className="mt-8 space-y-4">
                <div className="flex items-end justify-between border-b border-white/5 pb-2">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 flex items-center gap-2">
                    <CalendarDays className="w-3 h-3" />
                    EVENTS
                  </p>
                  <p className="text-2xl font-black text-white leading-none italic">{totalEvents}</p>
                </div>
                <div className="flex items-end justify-between border-b border-white/5 pb-2">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 flex items-center gap-2">
                    <Users className="w-3 h-3" />
                    CLUBS
                  </p>
                  <p className="text-2xl font-black text-white leading-none italic">{totalClubs}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="p-6 border-t border-white/5 bg-black/10">
          {user ? (
            <Link href="/profile" className="flex items-center gap-4 p-4 hover:bg-white/5 cursor-pointer transition-all duration-200 group border border-transparent hover:border-white/10">
              <div className="w-10 h-10 bg-white flex items-center justify-center text-primary font-black text-xs shrink-0 border border-white transition-all">
                {user.firstName[0]}{user.lastName[0]}
              </div>
              <div className="overflow-hidden">
                <div className="text-[10px] font-black text-white uppercase tracking-widest truncate">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-[9px] text-white/30 truncate font-bold uppercase tracking-tighter mt-0.5">
                  {user.email}
                </div>
              </div>
            </Link>
          ) : (
            <Link href={authHrefWithReturn(location)}>
              <span className="connect-primary-btn !bg-white !text-primary w-full justify-center">
                SIGN IN <ArrowUpRight className="w-3 h-3" />
              </span>
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-sidebar text-sidebar-foreground flex items-center justify-between px-8 z-50 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-white flex items-center justify-center">
            <img src="/images/logo.png" alt="BYU" className="w-full h-full object-contain p-0.5" />
          </div>
          <span className="font-sans font-black text-xl tracking-tighter italic">BYU</span>
        </Link>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Nav Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "tween", duration: 0.2 }}
            className="fixed inset-0 bg-sidebar z-40 flex flex-col pt-24 px-8"
          >
            <nav className="flex-1 space-y-2">
              {visibleNavItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.name} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                    <span className={cn(
                      "flex items-center justify-between py-6 text-xl font-black italic uppercase tracking-tighter border-b border-white/10",
                      isActive ? "text-white bg-white/10 px-4 -mx-4" : "text-white/40"
                    )}>
                      {item.name}
                      <ArrowUpRight className="w-5 h-5" />
                    </span>
                  </Link>
                );
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 md:ml-72 pt-16 md:pt-0 min-h-screen">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="max-w-7xl mx-auto p-8 md:p-16 lg:p-20"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
