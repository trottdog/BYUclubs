import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useGetUserProfile } from "@workspace/api-client-react";
import { EventCard } from "@/components/event-card";
import { Bookmark, CalendarCheck, LogOut, Loader2 } from "lucide-react";

export default function ProfilePage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation(`/auth?return=${encodeURIComponent("/profile")}`);
    }
  }, [user, authLoading, setLocation]);

  const { data: profile, isLoading: profileLoading } = useGetUserProfile({
    query: {
      enabled: !!user
    }
  });

  if (authLoading || !user) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 overflow-x-hidden pb-24 md:pb-12">
      <div className="connect-card relative flex flex-col items-center gap-6 overflow-hidden border-2 border-border p-6 md:flex-row md:items-start md:p-10">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center border-2 border-primary bg-primary text-3xl font-black text-white md:h-32 md:w-32 md:text-4xl">
          {user.firstName[0]}
          {user.lastName[0]}
        </div>

        <div className="flex-1 pt-2 text-center md:text-left">
          <p className="connect-eyebrow mb-1">Profile</p>
          <h2 className="font-sans text-2xl font-black uppercase italic tracking-tighter text-foreground md:text-3xl">
            {user.firstName} {user.lastName}
          </h2>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{user.email}</p>

          {profileLoading ? (
            <div className="mt-6 flex items-center justify-center gap-4 md:justify-start">
              <div className="h-20 w-32 animate-pulse bg-muted" />
              <div className="h-20 w-32 animate-pulse bg-muted" />
            </div>
          ) : (
            <div className="mt-6 flex flex-wrap justify-center gap-4 md:justify-start">
              <div className="connect-panel flex min-w-[140px] flex-col items-center border-2 bg-white md:items-start">
                <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                  <Bookmark className="h-4 w-4 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Saved</span>
                </div>
                <p className="text-3xl font-black italic text-foreground">{profile?.savedCount || 0}</p>
              </div>

              <div className="connect-panel flex min-w-[140px] flex-col items-center border-2 bg-white md:items-start">
                <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                  <CalendarCheck className="h-4 w-4 text-[#22c55e]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Reservations</span>
                </div>
                <p className="text-3xl font-black italic text-foreground">{profile?.reservationsCount || 0}</p>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-2 flex w-full items-center justify-center gap-2 border-2 border-transparent px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-destructive transition-colors hover:border-destructive/30 hover:bg-destructive/5 md:absolute md:right-6 md:top-6 md:mt-0 md:w-auto"
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </div>

      {profileLoading ? (
        <div className="w-full h-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : profile && (
        <div className="space-y-12">
          <section>
            <div className="mb-6 flex items-end gap-3 border-b-4 border-primary pb-4">
              <CalendarCheck className="h-6 w-6 shrink-0 text-[#22c55e]" />
              <div>
                <p className="connect-section-label">Schedule</p>
                <h3 className="font-sans text-2xl font-black uppercase italic tracking-tighter text-foreground md:text-3xl">
                  My reservations
                </h3>
              </div>
            </div>

            {!profile.reservations || profile.reservations.length === 0 ? (
              <div className="border-2 border-dashed border-border bg-muted/20 p-10 text-center">
                <CalendarCheck className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
                <p className="font-bold uppercase tracking-wide text-muted-foreground">No reservations yet.</p>
                <p className="mt-1 text-sm text-muted-foreground">Spots you reserve will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {profile.reservations.map(ev => <EventCard key={ev.id} event={ev} compact />)}
              </div>
            )}
          </section>

          <section>
            <div className="mb-6 flex items-end gap-3 border-b-4 border-primary pb-4">
              <Bookmark className="h-6 w-6 shrink-0 text-primary" />
              <div>
                <p className="connect-section-label">Bookmarks</p>
                <h3 className="font-sans text-2xl font-black uppercase italic tracking-tighter text-foreground md:text-3xl">
                  Saved events
                </h3>
              </div>
            </div>

            {!profile.savedEvents || profile.savedEvents.length === 0 ? (
              <div className="border-2 border-dashed border-border bg-muted/20 p-10 text-center">
                <Bookmark className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
                <p className="font-bold uppercase tracking-wide text-muted-foreground">No saved events.</p>
                <p className="mt-1 text-sm text-muted-foreground">Events you bookmark will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {profile.savedEvents.map(ev => <EventCard key={ev.id} event={ev} compact />)}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
